import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Upload, CheckCircle, AlertTriangle, FlaskConical, Droplets,
  Sun, Wind, Waves, Sprout, X, ClipboardList, Search, BarChart3,
  Languages, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type SoilAnalysisResult } from '../lib/types';

const SAMPLE_REPORTS = [
  `Soil Test Report - Field #3
  pH: 6.8 (slightly acidic)
  Nitrogen (N): 45 kg/ha (low)
  Phosphorus (P): 28 kg/ha (medium)
  Potassium (K): 210 kg/ha (high)
  Organic Matter: 2.8% (moderate)
  Moisture Content: 32% (optimal)
  Soil Texture: Sandy Loam
  CEC: 12.5 meq/100g
  Recommendations: Apply 120 kg/ha urea, add 40 kg/ha SSP, maintain current K levels.`,
  `मृदा परीक्षण रिपोर्ट - खेत #2
  pH: 5.5 (अम्लीय)
  नाइट्रोजन (N): 30 kg/ha (कम)
  फॉस्फोरस (P): 20 kg/ha (कम)
  पोटेशियम (K): 120 kg/ha (कम)
  जैविक पदार्थ: 1.8% (कम)
  नमी: 28% (सामान्य)
  मिट्टी की बनावट: मिट्टी भुरभुरी
  सुझाव: यूरिया 150 kg/ha, SSP 50 kg/ha, MOP 60 kg/ha लगाएं।`,
  `நிலப் பரிசோதனை அறிக்கை - நிலம் #1
  pH: 7.0 (நடுத்தரம்)
  நைட்ரஜன் (N): 55 kg/ha (நடுத்தரம்)
  பாஸ்பரஸ் (P): 35 kg/ha (நடுத்தரம்)
  பொட்டாசியம் (K): 195 kg/ha (நடுத்தரம்)
  கரிமப் பொருள்: 3.0% (நல்லது)
  ஈரப்பதம்: 35% (சிறந்தது)
  மண் அமைப்பு: வண்டல் மணல்
  பரிந்துரைகள்: தற்போதைய பாசனத்தை தொடருங்கள், நீர்ப்பாசனத்தை மேம்படுத்துங்கள்.`,
];

function getNutrientStatus(value: number, type: 'ph' | 'n' | 'p' | 'k' | 'om' | 'moisture') {
  const ranges: Record<string, [number, number, string, string]> = {
    ph: [6.0, 7.5, 'optimal', 'adjust pH'],
    n: [50, 80, 'good', 'add nitrogen'],
    p: [30, 50, 'good', 'add phosphorus'],
    k: [150, 250, 'good', 'add potassium'],
    om: [3, 5, 'good', 'add organic matter'],
    moisture: [25, 40, 'optimal', 'adjust irrigation'],
  };
  const [min, max] = ranges[type];
  if (value >= min && value <= max) return { status: 'Optimal', color: 'text-emerald-600', bg: 'bg-emerald-100', bar: 'bg-emerald-500' };
  if (value < min) return { status: 'Low', color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' };
  return { status: 'High', color: 'text-orange-600', bg: 'bg-orange-100', bar: 'bg-orange-500' };
}

function getPhBar(ph: number): number { return Math.min(100, Math.max(0, (ph / 14) * 100)); }
function getNutrientBar(value: number, max: number): number { return Math.min(100, (value / max) * 100); }

function normalizeGeminiResult(raw: Record<string, unknown>): SoilAnalysisResult {
  const num = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return isNaN(n) ? null : n;
  };
  const str = (v: unknown) => {
    if (v === null || v === undefined) return null;
    return String(v).trim();
  };

  const ph = num(raw.ph_level) ?? 6.5;
  const n = num(raw.nitrogen) ?? 40;
  const p = num(raw.phosphorus) ?? 25;
  const k = num(raw.potassium) ?? 150;
  const om = num(raw.organic_matter) ?? 2.5;
  const moisture = num(raw.moisture) ?? 25;
  const texture = str(raw.texture) ?? 'Loam';
  const recommendations = str(raw.recommendations) ?? 'Maintain current soil management practices.';
  const fertilityScore = Math.min(100, Math.round(
    (ph >= 6 && ph <= 7.5 ? 25 : 15) +
    (n > 50 ? 20 : n > 30 ? 15 : 10) +
    (p > 30 ? 20 : p > 15 ? 15 : 10) +
    (k > 150 ? 15 : 10) +
    (om > 3 ? 20 : om > 2 ? 15 : 10)
  ));

  return { ph_level: ph, nitrogen: n, phosphorus: p, potassium: k, organic_matter: om, moisture, texture, recommendations, fertility_score: fertilityScore };
}

export default function SoilAnalyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SoilAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/soil-analyzer`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ rawText: text }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      const analysis = normalizeGeminiResult(data);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveToDb = async () => {
    if (!result) return;
    const { data, error } = await supabase.from('soil_reports').insert({
      raw_text: text, ph_level: result.ph_level, nitrogen: result.nitrogen, phosphorus: result.phosphorus,
      potassium: result.potassium, organic_matter: result.organic_matter, moisture: result.moisture,
      texture: result.texture, recommendations: result.recommendations,
    }).select();
    if (!error && data) { setSaved(true); setSavedReports(prev => [data[0], ...prev]); setTimeout(() => setSaved(false), 3000); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setText(text);
    setResult(null);
    setError(null);
  };

  const loadSample = (idx: number) => { setText(SAMPLE_REPORTS[idx]); setResult(null); setError(null); setShowSample(false); };

  const fetchSavedReports = async () => {
    const { data } = await supabase.from('soil_reports').select('*').order('analyzed_at', { ascending: false }).limit(20);
    if (data) { setSavedReports(data); setShowSaved(true); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg sm:rounded-xl shadow-lg">
              <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Soil Report Analyzer</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">AI-powered extraction in any language</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> Input Report</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowSample(!showSample)} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-100 transition-colors touch-target">Samples</button>
                  <button onClick={fetchSavedReports} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 transition-colors touch-target">History</button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {showSample && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} className="mb-4 space-y-2">
                    {SAMPLE_REPORTS.map((report, idx) => (
                      <button key={idx} onClick={() => loadSample(idx)} className="w-full text-left p-2.5 sm:p-3 bg-amber-50 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-amber-100 transition-colors border border-amber-100 touch-target">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
                          <span className="truncate">{report.split('\n')[0]}</span>
                          {idx > 0 && <Languages className="w-3 h-3 text-blue-500 ml-2" />}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-amber-50 text-amber-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200 touch-target"><Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Upload File</button>
                    {fileName && <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> {fileName}</span>}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                  <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  <span className="text-[10px] sm:text-xs text-blue-600 font-medium">Supports all languages - English, Hindi, Tamil, and more</span>
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste or type your soil report... The AI will extract pH, NPK, organic matter, moisture, and texture automatically." className="w-full h-40 sm:h-72 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-xs sm:text-sm leading-relaxed" />
                <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3">
                  <button onClick={analyze} disabled={loading || !text.trim()} className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target">
                    {loading ? (<><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Analyzing...</>) : (<><Search className="w-4 h-4 sm:w-5 sm:h-5" /> Analyze Report</>)}
                  </button>
                  <button onClick={() => { setText(''); setResult(null); setFileName(null); setError(null); }} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors touch-target"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                </div>
                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 sm:mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-2.5 sm:p-3 border border-red-100">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            {result ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> Analysis Results</h2>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm text-gray-500">Fertility:</span>
                    <span className={`text-base sm:text-lg font-bold ${result.fertility_score > 70 ? 'text-emerald-600' : result.fertility_score > 40 ? 'text-amber-600' : 'text-red-600'}`}>{result.fertility_score}/100</span>
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <ParameterCard label="pH Level" value={result.ph_level} unit="" icon={<Droplets className="w-3.5 h-3.5" />} status={getNutrientStatus(result.ph_level, 'ph')} bar={getPhBar(result.ph_level)} maxBar={100} color="bg-blue-500" />
                    <ParameterCard label="Nitrogen" value={result.nitrogen} unit="kg/ha" icon={<Sprout className="w-3.5 h-3.5" />} status={getNutrientStatus(result.nitrogen, 'n')} bar={getNutrientBar(result.nitrogen, 100)} maxBar={100} color="bg-green-500" />
                    <ParameterCard label="Phosphorus" value={result.phosphorus} unit="kg/ha" icon={<Sun className="w-3.5 h-3.5" />} status={getNutrientStatus(result.phosphorus, 'p')} bar={getNutrientBar(result.phosphorus, 60)} maxBar={100} color="bg-yellow-500" />
                    <ParameterCard label="Potassium" value={result.potassium} unit="kg/ha" icon={<FlameIcon />} status={getNutrientStatus(result.potassium, 'k')} bar={getNutrientBar(result.potassium, 300)} maxBar={100} color="bg-red-500" />
                    <ParameterCard label="Organic" value={result.organic_matter} unit="%" icon={<Waves className="w-3.5 h-3.5" />} status={getNutrientStatus(result.organic_matter, 'om')} bar={getNutrientBar(result.organic_matter, 6)} maxBar={100} color="bg-amber-600" />
                    <ParameterCard label="Moisture" value={result.moisture} unit="%" icon={<Wind className="w-3.5 h-3.5" />} status={getNutrientStatus(result.moisture, 'moisture')} bar={getNutrientBar(result.moisture, 60)} maxBar={100} color="bg-cyan-500" />
                  </div>
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Soil Texture</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center"><FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
                      <span className="text-base sm:text-lg font-semibold text-gray-900">{result.texture}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-100">
                    <p className="text-xs sm:text-sm font-medium text-amber-800 mb-1.5 sm:mb-2">Recommendations</p>
                    <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">{result.recommendations}</p>
                  </div>
                  <button onClick={saveToDb} className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-colors shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Save Analysis</button>
                  {saved && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-green-600 font-medium flex items-center justify-center gap-2 text-sm"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Analysis saved!</motion.p>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-12 text-center">
                <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center"><FlaskConical className="w-7 h-7 sm:w-10 sm:h-10 text-gray-400" /></div>
                <p className="text-gray-500 font-medium text-sm sm:text-base">Enter a soil report to extract parameters</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">AI parses pH, NPK, organic matter, and texture</p>
                <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-blue-600">
                  <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Supports English, Hindi, Tamil, and more</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {showSaved && savedReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-4 sm:mt-8 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Your Saved Reports</h3>
              <button onClick={() => setShowSaved(false)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg touch-target"><X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" /></button>
            </div>
            {savedReports.length === 0 ? (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">No reports saved yet</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[480px]">
                  <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">Date</th><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">pH</th><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">N</th><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">P</th><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">K</th><th className="text-left px-3 py-2 sm:px-4 sm:py-3 font-medium text-gray-700">Texture</th></tr></thead>
                  <tbody>
                    {savedReports.map((report) => (
                      <tr key={report.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-gray-900">{new Date(report.analyzed_at).toLocaleDateString()}</td><td className="px-3 py-2 sm:px-4 sm:py-3">{report.ph_level}</td><td className="px-3 py-2 sm:px-4 sm:py-3">{report.nitrogen}</td><td className="px-3 py-2 sm:px-4 sm:py-3">{report.phosphorus}</td><td className="px-3 py-2 sm:px-4 sm:py-3">{report.potassium}</td><td className="px-3 py-2 sm:px-4 sm:py-3">{report.texture}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ParameterCard({ label, value, unit, icon, status, bar, color }: {
  label: string; value: number; unit: string; icon: React.ReactNode;
  status: { status: string; color: string; bg: string; bar: string };
  bar: number; maxBar: number; color: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2"><div className={`w-6 h-6 sm:w-8 sm:h-8 ${status.bg} rounded-md sm:rounded-lg flex items-center justify-center text-gray-600`}>{icon}</div><span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span></div>
        <span className={`text-[10px] sm:text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full ${status.bg} ${status.color}`}>{status.status}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900 mb-1.5 sm:mb-2">{value}{unit ? ` ${unit}` : ''}</p>
      <div className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${bar}%` }} /></div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0 0 0 0 0 0 4.5 2.5 6.5 2.5 10.5 0 2.5-2.5 4.5-2.5 4.5s-2.5-2-2.5-4.5c0-4 2.5-6 2.5-10.5 0 0 0 0 0 0z" />
      <path d="M12 22c-2.5 0-4.5-2-4.5-4.5 0-2 1.5-3.5 2.5-4.5 0 0 2 1.5 2 4.5 0 0 0 0 0 0z" />
    </svg>
  );
}
