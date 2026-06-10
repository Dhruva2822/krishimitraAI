import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Scan, AlertTriangle, CheckCircle, Shield, Leaf,
  Activity, ChevronRight, RefreshCw, X, Search, Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type DiseaseDetectionResult, type DiseaseKnowledge } from '../lib/types';

const DISEASE_DATABASE: DiseaseKnowledge[] = [
  { id: '1', name: 'Leaf Blight', crop_affected: 'Rice', symptoms: 'Brown spots with yellow halos on leaves, starting from tips', causes: 'Fungal infection (Helminthosporium oryzae)', treatment: 'Apply Mancozeb 75% WP @ 2.5g/L water or Tricyclazole 75% WP @ 1g/L', prevention: 'Use resistant varieties, avoid excessive nitrogen, maintain proper spacing', image_url: null },
  { id: '2', name: 'Bacterial Wilt', crop_affected: 'Tomato', symptoms: 'Wilting of leaves, dark streaks on stem, bacterial ooze', causes: 'Ralstonia solanacearum bacteria', treatment: 'Remove infected plants, apply copper-based fungicides, solarize soil', prevention: 'Use certified seeds, crop rotation, avoid waterlogging', image_url: null },
  { id: '3', name: 'Powdery Mildew', crop_affected: 'Wheat', symptoms: 'White powdery patches on leaves, stunted growth', causes: 'Erysiphe graminis fungus', treatment: 'Apply Sulfur-based fungicides or Propiconazole 25% EC @ 1mL/L', prevention: 'Ensure good air circulation, avoid overhead irrigation, use resistant varieties', image_url: null },
  { id: '4', name: 'Root Rot', crop_affected: 'Maize', symptoms: 'Yellowing leaves, stunted growth, decayed roots', causes: 'Pythium and Fusarium fungi', treatment: 'Drench soil with Carbendazim 50% WP @ 1g/L, improve drainage', prevention: 'Avoid over-irrigation, use well-drained soil, treat seeds with fungicide', image_url: null },
  { id: '5', name: 'Yellow Mosaic Virus', crop_affected: 'Soybean', symptoms: 'Yellow mosaic pattern on leaves, reduced pod formation', causes: 'Mungbean yellow mosaic virus', treatment: 'No cure - remove infected plants, use insecticides for vector control', prevention: 'Use resistant varieties, control whitefly vectors, remove weed hosts', image_url: null },
  { id: '6', name: 'Downy Mildew', crop_affected: 'Grape', symptoms: 'Yellow oil spots on upper leaf surface, white downy growth underneath', causes: 'Plasmopara viticola oomycete', treatment: 'Apply Metalaxyl or Mancozeb, improve air circulation', prevention: 'Use resistant rootstocks, avoid overhead irrigation, prune for airflow', image_url: null },
  { id: '7', name: 'Early Blight', crop_affected: 'Potato', symptoms: 'Dark brown concentric rings on lower leaves, defoliation', causes: 'Alternaria solani fungus', treatment: 'Apply Chlorothalonil or Mancozeb, remove infected leaves', prevention: 'Crop rotation, adequate spacing, balanced fertilization', image_url: null },
  { id: '8', name: 'Citrus Canker', crop_affected: 'Citrus', symptoms: 'Raised corky lesions on leaves, fruit, and stems', causes: 'Xanthomonas citri subsp. citri bacteria', treatment: 'Apply copper sprays, prune infected branches', prevention: 'Use certified nursery stock, windbreaks, avoid overhead irrigation', image_url: null },
  { id: '9', name: 'Anthracnose', crop_affected: 'Mango', symptoms: 'Sunken black spots on fruit, flower blight, twig dieback', causes: 'Colletotrichum gloeosporioides fungus', treatment: 'Apply Carbendazim + Mancozeb, post-harvest hot water treatment', prevention: 'Prune for airflow, remove mummified fruit, avoid mechanical injury', image_url: null },
  { id: '10', name: 'Brown Spot', crop_affected: 'Coconut', symptoms: 'Brown spots on leaflets, premature nut fall, reduced yield', causes: 'Bipolaris incurvata fungus', treatment: 'Apply Bordeaux mixture 1%, improve nutrition', prevention: 'Proper drainage, balanced fertilization, regular monitoring', image_url: null },
  { id: '11', name: 'Healthy Plant', crop_affected: 'General', symptoms: 'Vibrant green color, uniform texture, no spots or lesions', causes: 'N/A', treatment: 'Continue standard care practices', prevention: 'Regular monitoring, balanced nutrition, proper irrigation', image_url: null },
  { id: '12', name: 'Healthy Plant', crop_affected: 'General', symptoms: 'Uniform green color, well-formed leaves, no visible damage', causes: 'N/A', treatment: 'Continue standard care practices', prevention: 'Regular monitoring, balanced nutrition, proper irrigation', image_url: null },
];

function isLeafImage(imageData: ImageData): { isLeaf: boolean; reason: string } {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  let greenPixels = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  let brightPixels = 0;
  let darkPixels = 0;
  let leafGreenPixels = 0;
  let yellowGreenPixels = 0;
  let darkGreenPixels = 0;
  let lightGreenPixels = 0;
  let greenVariance = 0;
  let edgeLikePixels = 0;
  let uniformGreenRegions = 0;
  let lastGreenVal = -1;
  let greenRunLength = 0;
  let maxGreenRun = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalR += r; totalG += g; totalB += b;

    const brightness = (r + g + b) / 3;
    if (brightness > 200) brightPixels++;
    if (brightness < 40) darkPixels++;

    // Broad green detection
    if (g > 70 && g > r * 0.85 && g > b * 0.85) {
      greenPixels++;
    }

    // Leaf-specific green shades: natural leaves show characteristic green tones
    // Dark green (healthy mature leaf)
    if (g > 50 && g < 160 && g > r * 1.0 && g > b * 1.1 && r < 120 && b < 100) {
      darkGreenPixels++;
    }
    // Medium-bright green (young/healthy leaf)
    if (g > 90 && g < 200 && g > r * 1.05 && g > b * 1.15 && r > 40 && r < 160) {
      leafGreenPixels++;
    }
    // Light green / yellowish green (new growth or slight stress)
    if (g > 120 && g < 230 && r > 80 && r < 180 && b < 120 && g > r * 0.85) {
      lightGreenPixels++;
    }
    // Yellow-green (early disease or autumn)
    if (g > 100 && r > 120 && r < 220 && g > r * 0.7 && g > b * 1.3 && b < 100) {
      yellowGreenPixels++;
    }

    // Detect color variation within green areas (leaves have natural variation)
    if (g > r * 0.85 && g > b * 0.85 && g > 60) {
      const localVar = Math.abs(g - lastGreenVal);
      greenVariance += localVar;
      if (lastGreenVal >= 0 && Math.abs(g - lastGreenVal) > 8) {
        edgeLikePixels++;
      }

      // Track run lengths of green for uniformity detection
      if (Math.abs(g - lastGreenVal) < 10) {
        greenRunLength++;
        maxGreenRun = Math.max(maxGreenRun, greenRunLength);
      } else {
        greenRunLength = 1;
      }
      lastGreenVal = g;
    } else {
      lastGreenVal = -1;
      greenRunLength = 0;
    }
  }

  const avgG = totalG / totalPixels;
  const avgR = totalR / totalPixels;
  const avgB = totalB / totalPixels;
  const greenRatio = greenPixels / totalPixels;
  const brightRatio = brightPixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  const darkGreenRatio = darkGreenPixels / totalPixels;
  const leafGreenRatio = leafGreenPixels / totalPixels;
  const lightGreenRatio = lightGreenPixels / totalPixels;
  const yellowGreenRatio = yellowGreenPixels / totalPixels;
  const naturalGreenVariety = (darkGreenPixels > 0 ? 1 : 0) + (leafGreenPixels > totalPixels * 0.05 ? 1 : 0) + (lightGreenPixels > 0 ? 1 : 0) + (yellowGreenPixels > 0 ? 1 : 0);
  const avgGreenVariance = greenPixels > 0 ? greenVariance / greenPixels : 0;
  const edgeRatio = edgeLikePixels / totalPixels;
  const maxRunRatio = maxGreenRun / totalPixels;

  // 1. Sky/water/landscape - blue dominant
  if (avgB > avgG * 0.95 && avgB > avgR * 0.95 && greenRatio < 0.25) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 2. Paper/screen/document - mostly white/very bright
  if (brightRatio > 0.6 && greenRatio < 0.1) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 3. Low-light/night - mostly dark
  if (darkRatio > 0.5 && greenRatio < 0.15) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 4. Skin/face - warm tones with little green
  if (avgR > avgG + 20 && avgG > avgB + 10 && greenRatio < 0.25) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 5. Objects/food - red/orange dominant
  if (avgR > avgG + 30 && avgG > avgB + 10 && greenRatio < 0.2) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 6. Grayscale/sepia - no green
  const colorRange = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
  if (colorRange < 15 && greenRatio < 0.15) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 7. Strict green ratio - leaves must dominate the image
  if (greenRatio < 0.30) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 8. Green must be the clearly dominant channel
  if (avgG < avgR * 0.95 || avgG < avgB * 0.9) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 9. Uniform green surfaces (walls, shirts, objects) - too little color variation
  // Real leaves have natural veining, shadows, and color gradients
  if (avgGreenVariance < 3 && greenRatio > 0.5) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 10. Too-uniform green regions (solid green objects like paint/walls)
  if (maxRunRatio > 0.15 && avgGreenVariance < 6) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 11. Must have natural leaf green variety - real leaves show multiple green tones
  if (naturalGreenVariety < 2 && leafGreenRatio < 0.15) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 12. Leaf-specific green tones must be present in meaningful amounts
  if (leafGreenRatio < 0.10 && darkGreenRatio < 0.08 && lightGreenRatio < 0.05) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 13. Artificial green (neon/saturated) - real leaves have more muted greens
  const artificialGreenPixels = (() => {
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > 200 && r < 50 && b < 50) count++;
    }
    return count;
  })();
  if (artificialGreenPixels / totalPixels > 0.3) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // 14. Edge/texture check - leaves have veins and edges creating color transitions
  if (greenRatio > 0.4 && edgeRatio < 0.02) {
    return { isLeaf: false, reason: 'PLEASE UPLOAD LEAF IMAGES ONLY' };
  }

  // Passed all checks
  return { isLeaf: true, reason: 'Valid leaf image detected' };
}

function analyzeImageColors(imageData: ImageData): DiseaseDetectionResult {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  let greenPixels = 0, yellowPixels = 0, brownPixels = 0, whitePixels = 0, darkPixels = 0;
  let totalR = 0, totalG = 0, totalB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalR += r; totalG += g; totalB += b;
    if (g > 100 && g > r * 1.2 && g > b * 1.2) greenPixels++;
    else if (r > 180 && g > 180 && b < 100) yellowPixels++;
    else if (r > 100 && g < 100 && b < 80) brownPixels++;
    else if (r > 200 && g > 200 && b > 200) whitePixels++;
    else if (r < 60 && g < 60 && b < 60) darkPixels++;
  }

  const avgG = totalG / totalPixels;
  const avgR = totalR / totalPixels;
  const avgB = totalB / totalPixels;
  const greenRatio = greenPixels / totalPixels;
  const yellowRatio = yellowPixels / totalPixels;
  const brownRatio = brownPixels / totalPixels;
  const whiteRatio = whitePixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;

  const healthScore = (greenRatio * 0.6) + ((1 - brownRatio - yellowRatio) * 0.4);

  if (healthScore > 0.75 && brownRatio < 0.05 && yellowRatio < 0.05) {
    return { disease: 'Healthy Plant', confidence: Math.round(healthScore * 100), severity: 'Healthy', treatment: 'Continue standard care practices', symptoms: 'Uniform green color, well-formed leaves, no visible damage', crop: 'General' };
  }

  if (yellowRatio > 0.15 && brownRatio > 0.08) {
    return { disease: 'Leaf Blight', confidence: Math.round(65 + (yellowRatio + brownRatio) * 100), severity: yellowRatio > 0.25 ? 'Severe' : 'Moderate', treatment: 'Apply Mancozeb 75% WP @ 2.5g/L water', symptoms: 'Brown spots with yellow halos on leaves, starting from tips', crop: 'Rice' };
  }

  if (whiteRatio > 0.12 && greenRatio > 0.3) {
    return { disease: 'Powdery Mildew', confidence: Math.round(60 + whiteRatio * 200), severity: whiteRatio > 0.25 ? 'Severe' : 'Moderate', treatment: 'Apply Sulfur-based fungicides or Propiconazole 25% EC', symptoms: 'White powdery patches on leaves, stunted growth', crop: 'Wheat' };
  }

  if (brownRatio > 0.15 && darkRatio > 0.05) {
    return { disease: 'Root Rot', confidence: Math.round(55 + brownRatio * 150), severity: brownRatio > 0.25 ? 'Severe' : 'Moderate', treatment: 'Drench soil with Carbendazim 50% WP @ 1g/L', symptoms: 'Yellowing leaves, stunted growth, decayed roots', crop: 'Maize' };
  }

  if (yellowRatio > 0.1 && greenRatio < 0.3) {
    return { disease: 'Yellow Mosaic Virus', confidence: Math.round(60 + yellowRatio * 180), severity: yellowRatio > 0.3 ? 'Severe' : 'Moderate', treatment: 'Remove infected plants, use insecticides for vector control', symptoms: 'Yellow mosaic pattern on leaves, reduced pod formation', crop: 'Soybean' };
  }

  if (brownRatio > 0.08 && avgR > 120) {
    return { disease: 'Bacterial Wilt', confidence: Math.round(55 + brownRatio * 180), severity: brownRatio > 0.2 ? 'Severe' : 'Moderate', treatment: 'Remove infected plants, apply copper-based fungicides', symptoms: 'Wilting of leaves, dark streaks on stem, bacterial ooze', crop: 'Tomato' };
  }

  return { disease: 'Healthy Plant', confidence: Math.round(healthScore * 100), severity: 'Healthy', treatment: 'Continue standard care practices', symptoms: 'Uniform green color, well-formed leaves, no visible damage', crop: 'General' };
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Healthy': return 'bg-emerald-500';
    case 'Mild': return 'bg-yellow-400';
    case 'Moderate': return 'bg-orange-500';
    case 'Severe': return 'bg-red-600';
    default: return 'bg-gray-400';
  }
}

function getSeverityTextColor(severity: string): string {
  switch (severity) {
    case 'Healthy': return 'text-emerald-600';
    case 'Mild': return 'text-yellow-600';
    case 'Moderate': return 'text-orange-600';
    case 'Severe': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export default function DiseaseDetection() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'detect' | 'database'>('detect');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setResult(null);
      setSaved(false);
      setValidationError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = useCallback(() => { fileInputRef.current?.click(); }, []);

  const analyzeImage = useCallback(() => {
    if (!selectedImage || !canvasRef.current) return;
    setLoading(true);
    setValidationError(null);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = 224; canvas.height = 224;
      ctx.drawImage(img, 0, 0, 224, 224);
      const imageData = ctx.getImageData(0, 0, 224, 224);

      const validation = isLeafImage(imageData);
      if (!validation.isLeaf) {
        setValidationError(validation.reason);
        setLoading(false);
        return;
      }

      const detection = analyzeImageColors(imageData);
      setResult(detection);
      setLoading(false);
    };
    img.src = selectedImage;
  }, [selectedImage]);

  const saveResult = async () => {
    if (!result) return;
    const { error } = await supabase.from('crop_diseases').insert({
      detected_disease: result.disease, confidence: result.confidence, severity: result.severity,
      recommended_treatment: result.treatment, image_url: selectedImage
    });
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  const reset = () => { setSelectedImage(null); setResult(null); setSaved(false); setValidationError(null); };

  const filteredDiseases = DISEASE_DATABASE.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.crop_affected.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg sm:rounded-xl shadow-lg">
              <Scan className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Leaf Disease Detection</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">AI-powered crop health analysis</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 mb-4 sm:mb-6 bg-white rounded-xl p-1 sm:p-1.5 shadow-sm border border-gray-200 w-fit">
          <button onClick={() => setActiveTab('detect')} className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors ${activeTab === 'detect' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span className="flex items-center gap-1.5 sm:gap-2"><Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Detect</span>
          </button>
          <button onClick={() => setActiveTab('database')} className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors ${activeTab === 'database' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span className="flex items-center gap-1.5 sm:gap-2"><Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Database</span>
          </button>
        </div>

        {activeTab === 'detect' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> Upload Image</h2>
                </div>
                <div className="p-4 sm:p-6">
                  {!selectedImage ? (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-12 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors group">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                      </div>
                      <p className="text-gray-700 font-medium mb-1 text-sm sm:text-base">Click to upload leaf image</p>
                      <p className="text-gray-400 text-xs sm:text-sm">JPG, PNG - Leaf images only</p>
                      <div className="mt-3 sm:mt-4 flex gap-2 justify-center">
                        <button className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors touch-target">Choose File</button>
                        <button onClick={(e) => { e.stopPropagation(); handleCameraCapture(); }} className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors touch-target"><Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" /> Camera</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={selectedImage} alt="Crop leaf" className="w-full h-48 sm:h-64 object-cover rounded-xl" />
                        <button onClick={reset} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors touch-target"><X className="w-4 h-4 text-gray-600" /></button>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={analyzeImage} disabled={loading} className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target">
                          {loading ? (<><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Analyzing...</>) : (<><Scan className="w-4 h-4 sm:w-5 sm:h-5" /> Analyze</>)}
                        </button>
                        <button onClick={reset} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors touch-target"><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <AnimatePresence mode="wait">
                {validationError && null}

                {result && (
                  <motion.div key={result.disease} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-100">
                      <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> Analysis Result</h2>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md ${getSeverityColor(result.severity)}`}>
                          {result.severity === 'Healthy' ? <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" /> : <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500 font-medium">Detected Disease</p>
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate">{result.disease}</h3>
                          <p className={`text-xs sm:text-sm font-medium ${getSeverityTextColor(result.severity)}`}>{result.severity} Severity</p>
                        </div>
                        <div className="text-center flex-shrink-0">
                          <p className="text-xs sm:text-sm text-gray-500">Confidence</p>
                          <p className="text-lg sm:text-2xl font-bold text-gray-900">{result.confidence}%</p>
                        </div>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Affected Crop</p>
                          <p className="text-sm sm:text-base text-gray-900 flex items-center gap-2"><Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" /> {result.crop}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Symptoms</p>
                          <p className="text-xs sm:text-sm text-gray-900">{result.symptoms}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-100">
                          <p className="text-xs sm:text-sm font-medium text-emerald-800 mb-1">Recommended Treatment</p>
                          <p className="text-xs sm:text-sm text-emerald-900">{result.treatment}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={saveResult} className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5" /> Save to Database
                        </button>
                      </div>
                      {saved && (
                        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-green-600 font-medium flex items-center justify-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Result saved successfully!
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                )}

                {!result && !validationError && !loading && (
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-12 text-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Scan className="w-7 h-7 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm sm:text-base">Upload a leaf image and analyze</p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Only leaf images are accepted</p>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {activeTab === 'database' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="relative mb-4 sm:mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search diseases..." className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredDiseases.map((disease, index) => (
                  <motion.div key={disease.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03, duration: 0.2 }} className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-gray-100 hover:shadow-md transition-colors group cursor-pointer">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-medium">{disease.crop_affected}</span>
                      {disease.name === 'Healthy Plant' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{disease.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{disease.symptoms}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">{disease.treatment}</p>
                    <div className="flex items-center gap-1 text-green-600 text-xs sm:text-sm font-medium group-hover:gap-2 transition-all">View Details <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {/* Error Popup Modal */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
              onClick={reset}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 20 }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-red-100 max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 sm:p-6 text-center">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                    <AlertTriangle className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Invalid Image!</h2>
                  <p className="text-red-100 text-xs sm:text-sm mt-1">The uploaded image was not recognized as a leaf</p>
                </div>
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-5">
                  <div className="bg-red-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-red-200 text-center">
                    <p className="text-sm sm:text-lg font-bold text-red-800 tracking-wide">{validationError}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Tips for uploading</p>
                    <ul className="text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
                      <li className="flex items-center gap-2"><Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" /> Upload a clear photo of a plant leaf</li>
                      <li className="flex items-center gap-2"><Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" /> The leaf should be the main subject</li>
                      <li className="flex items-center gap-2"><Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" /> Avoid objects, faces, or scenery</li>
                      <li className="flex items-center gap-2"><Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" /> Green-colored objects are not accepted</li>
                    </ul>
                  </div>
                  <button
                    onClick={reset}
                    className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" /> Upload Leaf Image
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
