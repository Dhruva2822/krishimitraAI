import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = "AQ.Ab8RN6J1k_7nwo9I9YC95jKYqvmPbrN-AcphpfRISACHorW8Mw";
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash-preview-05-20", "gemini-1.5-flash-latest"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid rawText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analyze this soil test report. Extract the following parameters and return ONLY a JSON object with no markdown formatting, no code blocks, no explanation. The report may be in ANY language. Extract the values and return ONLY in English.

Return ONLY this exact JSON structure:
{"ph_level":number|null,"nitrogen":number|null,"phosphorus":number|null,"potassium":number|null,"organic_matter":number|null,"moisture":number|null,"texture":"string|null","recommendations":"string|null","fertility_score":number|null}

Rules:
- All numeric values must be numbers (no units in the JSON value). Strip units like kg/ha, %, etc.
- If a value is not found in the report, use null.
- pH_level should be a decimal between 0-14.
- N, P, K values should be numbers in kg/ha (convert if needed).
- organic_matter and moisture should be percentages as numbers.
- texture should be a string like "Sandy Loam", "Clay Loam", etc.
- recommendations should be the treatment advice in English.
- fertility_score should be a number 0-100 based on overall soil health.

Soil Report:
"""${rawText}"""
`;

    let geminiRes: Response | null = null;
    let lastError = "";

    for (const model of GEMINI_MODELS) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      if (geminiRes.ok) break;

      lastError = await geminiRes.text();
      // If 404 (model not found), try next model
      if (geminiRes.status === 404) continue;
      // For other errors, return immediately
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${geminiRes.status} - ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: `All Gemini models failed. Last error: ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData?.candidates?.[0];
    const generatedText = candidate?.content?.parts?.[0]?.text || "";

    if (!generatedText.trim()) {
      return new Response(
        JSON.stringify({ error: "Gemini returned empty response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extracted = null;
    try {
      const cleanText = generatedText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      extracted = JSON.parse(cleanText);
    } catch {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch {
          extracted = null;
        }
      }
    }

    if (!extracted || typeof extracted !== "object") {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response into JSON", raw_response: generatedText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clean: Record<string, number | string | null> = {};
    for (const [key, value] of Object.entries(extracted)) {
      if (key === "recommendations" || key === "texture" || key === "raw_response") {
        clean[key] = typeof value === "string" ? value : null;
      } else {
        const num = typeof value === "number" ? value : parseFloat(value as string);
        clean[key] = isNaN(num) ? null : num;
      }
    }

    return new Response(
      JSON.stringify(clean),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
