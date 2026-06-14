import base64
import io
import requests
from PIL import Image
from pypdf import PdfReader
import google.generativeai as genai
from openai import OpenAI

def extract_text_from_pdf(pdf_bytes):
    """Extract all text from PDF bytes."""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text.strip()
    except Exception as e:
        return f"Error reading PDF file: {str(e)}"

def query_gemini(prompt, api_key, image_bytes=None, model_name="gemini-1.5-flash"):
    """Send text/image request to Gemini model."""
    if not api_key:
        import os
        api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return "Error: Gemini API Key is missing. Please set it in the Settings page."
        
    model_name = model_name.strip() if model_name else "gemini-1.5-flash"
    
    # Try the user-specified model first, then modern standard models in fallback order
    models_to_try = [model_name]
    fallback_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"]
    
    for fm in fallback_models:
        if fm not in models_to_try:
            models_to_try.append(fm)
            
    last_error_msg = ""
    quota_error_msg = ""
    
    for current_model in models_to_try:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(current_model)
            
            contents = []
            if image_bytes:
                img = Image.open(io.BytesIO(image_bytes))
                contents.append(img)
            contents.append(prompt)
            
            # Use generation config to prevent deprecated issues
            response = model.generate_content(contents)
            return response.text
        except Exception as e:
            error_str = str(e)
            last_error_msg = error_str
            
            # Check for specific error categories
            error_lower = error_str.lower()
            is_api_key_error = (
                "api key not valid" in error_lower or 
                "api key expired" in error_lower or 
                "invalid api key" in error_lower or 
                "api_key_invalid" in error_lower or
                "api key is invalid" in error_lower or
                "key not found" in error_lower
            )
            is_rate_limit = "429" in error_str or "quota" in error_lower or "limit" in error_lower
            is_model_error = (
                "404" in error_str or 
                "not found" in error_lower or 
                "not supported" in error_lower or 
                "unexpected model" in error_lower or 
                "model name format" in error_lower or 
                "400" in error_str
            )
            
            if is_api_key_error and not is_rate_limit:
                # Fatal API key error - return immediately
                return f"Gemini API Error: Invalid API Key. (Details: {error_str})"
            elif is_rate_limit:
                if not quota_error_msg:
                    quota_error_msg = error_str
                print(f"Gemini Model {current_model} failed due to rate limit/quota. Retrying next fallback...")
                continue
            else:
                # Model mismatch, unexpected name format, or unsupported features - try next model
                print(f"Gemini Model {current_model} failed ({error_str}). Retrying next fallback...")
                continue
                
    if quota_error_msg:
        return f"Gemini API Error: Quota exceeded (429) on your API key. Please check your billing or free tier limits in Google AI Studio. (Details: {quota_error_msg})"
        
    return f"Gemini API Error: All attempted models failed. Last error: {last_error_msg}"

def query_groq(prompt, api_key, image_bytes=None, model="llama-3.3-70b-versatile"):
    """Send text request to Groq model using OpenAI compatibility layers."""
    try:
        if not api_key:
            import os
            api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            return "Error: Groq API Key is missing. Please set it in the Settings page."
            
        if image_bytes:
            return "Groq API Error: The configured Groq API key does not support vision/image inputs. Please switch the Cloud API Provider to Gemini, or use local Ollama mode for analyzing images."
            
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        
        messages = [
            {
                "role": "user",
                "content": prompt
            }
        ]
            
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Groq API Error: {str(e)}"

def query_ollama(prompt, host_url="http://localhost:11434", model="llama3.2", image_bytes=None):
    """Send text/image request to local Ollama API."""
    # Ensure correct host URL prefix
    if not host_url.startswith("http"):
        host_url = f"http://{host_url}"
        
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    
    if image_bytes:
        # For images, if the user runs local mode, default to llava
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        payload["images"] = [base64_image]
        # Override to standard vision model in Ollama if using default llama3.2
        if model == "llama3.2":
            payload["model"] = "llava"
            
    try:
        # Check connection first with 3s timeout
        requests.get(host_url, timeout=3)
    except Exception:
        return (
            f"Ollama Connection Error: Could not connect to Ollama at '{host_url}'. "
            "Please ensure Ollama is installed and running locally. "
            "If it is on a different port, configure it on the Settings page."
        )

    try:
        response = requests.post(f"{host_url}/api/generate", json=payload, timeout=90)
        response.raise_for_status()
        return response.json().get("response", "")
    except Exception as e:
        return (
            f"Ollama Error: {str(e)}. Please check if model '{payload['model']}' "
            "is pulled in Ollama (run 'ollama pull llama3.2' or 'ollama pull llava')."
        )

def run_model_query(prompt, image_bytes=None, file_text=None, config=None):
    """
    Route query to the correct model based on configuration.
    config should be a dict containing:
      - mode: 'Local' or 'Cloud'
      - cloud_provider: 'Gemini' or 'Groq'
      - gemini_key, groq_key, ollama_host, ollama_model
    """
    if not config:
        return "Application configuration is missing."
        
    # Append PDF text context if present
    full_prompt = prompt
    if file_text:
        full_prompt = f"{prompt}\n\n[DOCUMENT CONTENT/TEXT EXTRACT]:\n{file_text}"
        
    mode = config.get("mode", "Cloud")
    
    if mode == "Cloud":
        provider = config.get("cloud_provider", "Gemini")
        if provider == "Gemini":
            gemini_model = config.get("gemini_model", "gemini-1.5-flash")
            return query_gemini(full_prompt, config.get("gemini_key"), image_bytes, model_name=gemini_model)
        else:
            return query_groq(full_prompt, config.get("groq_key"), image_bytes)
    else:
        host = config.get("ollama_host", "http://localhost:11434")
        model = config.get("ollama_model", "llama3.2")
        return query_ollama(full_prompt, host, model, image_bytes)

def analyze_soil_report_ai(file_bytes, file_name, file_type, config):
    """
    Extract soil parameters, health, and fertilizer recommendations.
    Accepts PDF or Image.
    """
    prompt = """
    Analyze the uploaded soil test report.
    Identify and detail the following:
    1. Overall Soil Health Summary (explain texture, quality, pH category).
    2. Nutrient Deficiencies: Point out which values (Nitrogen N, Phosphorus P, Potassium K, Organic Matter, Moisture) are low, optimal, or high.
    3. Fertilizer & Soil Amendments: Give clear recommendations on what to add to make the soil fertile.
    
    Make the response clear, easy for a farmer to read, and formatted with clean bullet points.
    IMPORTANT: Provide the response in English.
    """
    
    image_bytes = None
    file_text = None
    
    if "pdf" in file_type.lower():
        file_text = extract_text_from_pdf(file_bytes)
    else:
        image_bytes = file_bytes
        
    return run_model_query(prompt, image_bytes=image_bytes, file_text=file_text, config=config)

def is_leaf_image_py(image_bytes):
    """Validate if the uploaded image contains a leaf (relaxed check)."""
    try:
        if not image_bytes or len(image_bytes) == 0:
            return False, "NOT AN LEAF, PLS UPLOAD LEAF IMAGES ONLY"
            
        img = Image.open(io.BytesIO(image_bytes))
        img_resized = img.convert("RGB").resize((224, 224))
        pixels = list(img_resized.getdata())
        
        # Check if the image is a solid color
        p0 = pixels[0]
        is_solid = all(p == p0 for p in pixels)
        if is_solid:
            return False, "NOT AN LEAF, PLS UPLOAD LEAF IMAGES ONLY"
            
        return True, "Valid leaf image detected"
    except Exception as e:
        return False, f"Image processing error: {str(e)}"

def diagnose_leaf_disease_ai(image_bytes, config):
    """Diagnose leaf disease, causes, and organic/chemical remedies."""
    # First, run python-based heuristic validation
    is_leaf, reason = is_leaf_image_py(image_bytes)
    if not is_leaf:
        return reason
        
    prompt = """
    Analyze the uploaded plant leaf image, diagnose the leaf disease, and detail the following:
    1. Plant & Detected Disease (Name, confidence estimation).
    2. Primary Causes (Fungal, bacterial, virus, insect pest, water/nutrient stress).
    3. Remedies: Provide organic/natural remedies and chemical treatments (with suggested dosage).
    4. Prevention Tips: How the farmer can protect future crops from this disease.
    
    Make the explanation clear, actionable, and formatted in clean sections.
    IMPORTANT: Provide the response in English.
    """
    return run_model_query(prompt, image_bytes=image_bytes, config=config)

def chat_voice_ai(user_question, config, language_name="English"):
    """Voice assistant chat query."""
    script_instructions = {
        "Telugu": "Telugu script (using Telugu characters like తెలుగు only, do not write Telugu in English/Latin letters)",
        "Hindi": "Hindi script (using Devanagari characters like हिंदी only, do not write Hindi in English/Latin letters)",
        "English": "English"
    }
    target_script = script_instructions.get(language_name, language_name)
    
    prompt = f"""
    You are KrishiMitra, an empathetic and highly knowledgeable AI agricultural assistant.
    A farmer is asking you the following question in {language_name}:
    "{user_question}"
    
    Answer the question as a friendly farming expert. Keep your response extremely brief, concise, and conversational.
    Limit the response to a maximum of 1 or 2 short sentences (under 30 words total). Do not write long paragraphs or essays.
    IMPORTANT: Provide the response directly in {target_script}. Do not output any other languages, scripts, or translations.
    """
    return run_model_query(prompt, config=config)
