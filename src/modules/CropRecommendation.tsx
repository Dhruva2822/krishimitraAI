import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wheat, Sprout, Leaf, Droplets, MapPin, Calendar, Check,
  AlertTriangle, ArrowRight, BookOpen, ChevronDown, ChevronUp,
  Thermometer, Sparkles, Database, RefreshCw, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CropRequirement {
  name: string;
  seasons: string[];
  locations: string[];
  ph: { min: number; max: number };
  n: { min: number; max: number };
  p: { min: number; max: number };
  k: { min: number; max: number };
  om: { min: number; max: number }; // Organic matter %
  moisture: { min: number; max: number }; // Moisture %
  duration: string;
  yieldPotential: string;
  varieties: string[];
  careTips: string[];
  description: string;
}

// Crop Database containing typical crop requirements (focused on Indian/global climates)
const CROP_DATABASE: CropRequirement[] = [
  {
    name: 'Rice (Paddy)',
    seasons: ['Kharif', 'Monsoon'],
    locations: ['West Bengal', 'Punjab', 'Uttar Pradesh', 'Tamil Nadu', 'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Odisha', 'Assam'],
    ph: { min: 5.5, max: 7.0 },
    n: { min: 80, max: 120 },
    p: { min: 40, max: 60 },
    k: { min: 40, max: 60 },
    om: { min: 2.0, max: 5.0 },
    moisture: { min: 45, max: 80 },
    duration: '120 - 150 days',
    yieldPotential: '3.5 - 6.0 tons/ha',
    varieties: ['IR64', 'Basmati 370', 'Pusa 1121', 'Swarna', 'Jaya'],
    careTips: [
      'Maintain standing water of 2-5 cm during vegetative and reproductive stages.',
      'Apply nitrogen fertilizer in split doses (sowing, tillering, panicle initiation).',
      'Keep field clean of weeds during the first 45 days.'
    ],
    description: 'A staple food crop requiring high temperature, high humidity, and abundant water or clayey soils that retain moisture.'
  },
  {
    name: 'Wheat',
    seasons: ['Rabi', 'Winter'],
    locations: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Bihar', 'Gujarat'],
    ph: { min: 6.0, max: 7.5 },
    n: { min: 100, max: 140 },
    p: { min: 50, max: 70 },
    k: { min: 40, max: 60 },
    om: { min: 1.5, max: 3.5 },
    moisture: { min: 25, max: 40 },
    duration: '110 - 140 days',
    yieldPotential: '4.0 - 5.5 tons/ha',
    varieties: ['HD 2967', 'Karan Vandana (DBW 187)', 'PBW 343', 'Lok-1', 'Sonalika'],
    careTips: [
      'Ensure 4-6 irrigations at critical growth stages, especially the crown root initiation (CRI) stage.',
      'Sow seeds at a depth of 4-5 cm in well-pulverized moist soil.',
      'Monitor for rust diseases and apply sulfur-based fungicides if detected.'
    ],
    description: 'A rabi crop requiring a cool growing season and bright sunshine at the time of ripening. Thrives in well-drained loamy soil.'
  },
  {
    name: 'Maize (Corn)',
    seasons: ['Kharif', 'Rabi', 'Zaid'],
    locations: ['Karnataka', 'Madhya Pradesh', 'Bihar', 'Tamil Nadu', 'Telangana', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh'],
    ph: { min: 5.8, max: 7.2 },
    n: { min: 90, max: 120 },
    p: { min: 40, max: 60 },
    k: { min: 40, max: 60 },
    om: { min: 2.0, max: 4.5 },
    moisture: { min: 25, max: 45 },
    duration: '90 - 110 days',
    yieldPotential: '5.0 - 7.5 tons/ha',
    varieties: ['Ganga 11', 'Deccan 103', 'Prakash', 'HQPM 1', 'Bio 9681'],
    careTips: [
      'Avoid waterlogging as maize is highly sensitive to standing water.',
      'Apply micro-nutrients, especially Zinc (Zinc Sulfate 25 kg/ha), as maize is prone to white bud.',
      'Maintain optimal plant density by maintaining row spacing of 60 cm.'
    ],
    description: 'Used as both food and fodder. It grows well under diverse climatic conditions and requires well-drained fertile soils.'
  },
  {
    name: 'Cotton',
    seasons: ['Kharif', 'Monsoon'],
    locations: ['Gujarat', 'Maharashtra', 'Telangana', 'Andhra Pradesh', 'Karnataka', 'Madhya Pradesh', 'Rajasthan', 'Haryana', 'Punjab'],
    ph: { min: 6.0, max: 8.0 },
    n: { min: 80, max: 100 },
    p: { min: 30, max: 50 },
    k: { min: 40, max: 60 },
    om: { min: 1.0, max: 3.0 },
    moisture: { min: 20, max: 35 },
    duration: '150 - 180 days',
    yieldPotential: '2.0 - 3.5 tons/ha',
    varieties: ['Bt Cotton (various hybrids)', 'MCU-5', 'H-4', 'Digvijay', 'Suvin'],
    careTips: [
      'Requires uniform warmth and sunny days; frost is highly damaging.',
      'Thrives in black clayey soils (regur) which have high water-holding capacity.',
      'Apply nitrogen in 3 splits and control bollworms using Bt varieties or integrated pest management.'
    ],
    description: 'A key cash crop requiring warm temperatures, moderate rainfall or irrigation, and deep, water-retentive black cotton soil.'
  },
  {
    name: 'Tomato',
    seasons: ['Kharif', 'Rabi', 'Zaid'],
    locations: ['Andhra Pradesh', 'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Odisha', 'West Bengal', 'Bihar'],
    ph: { min: 6.0, max: 7.0 },
    n: { min: 60, max: 90 },
    p: { min: 60, max: 80 },
    k: { min: 80, max: 120 },
    om: { min: 2.5, max: 5.0 },
    moisture: { min: 30, max: 50 },
    duration: '110 - 130 days',
    yieldPotential: '20 - 40 tons/ha',
    varieties: ['Pusa Ruby', 'Arka Vikas', 'Abhinav', 'Rashmi', 'Vaishali'],
    careTips: [
      'High Potassium (K) requirements are vital for uniform ripening and fruit quality.',
      'Provide stakes/supports for indeterminate varieties to keep fruit off the soil.',
      'Irrigate consistently; dry periods followed by heavy watering cause blossom end rot.'
    ],
    description: 'A popular vegetable crop that thrives in warm climates with well-drained, sandy loam soils rich in organic matter.'
  },
  {
    name: 'Potato',
    seasons: ['Rabi', 'Winter'],
    locations: ['Uttar Pradesh', 'West Bengal', 'Bihar', 'Gujarat', 'Madhya Pradesh', 'Punjab', 'Assam'],
    ph: { min: 5.2, max: 6.5 }, // Slightly acidic to prevent common scab
    n: { min: 120, max: 150 }, // Heavy feeder
    p: { min: 80, max: 100 },
    k: { min: 100, max: 150 },
    om: { min: 2.0, max: 4.5 },
    moisture: { min: 30, max: 45 },
    duration: '90 - 120 days',
    yieldPotential: '25 - 35 tons/ha',
    varieties: ['Kufri Jyoti', 'Kufri Bahar', 'Kufri Pukhraj', 'Kufri Chandramukhi', 'Lady Rosetta'],
    careTips: [
      'Maintain slightly acidic soil (pH 5.2-6.2) to prevent common scab disease.',
      'Earth up plants 30-40 days after sowing to protect tubers from sunlight and greening.',
      'Requires loose, sandy loam soil to allow uniform tuber expansion.'
    ],
    description: 'A cool-season tuber crop requiring high levels of fertilization, loose well-drained soil, and steady moisture.'
  },
  {
    name: 'Soybean',
    seasons: ['Kharif', 'Monsoon'],
    locations: ['Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Karnataka', 'Uttar Pradesh', 'Gujarat'],
    ph: { min: 6.0, max: 7.0 },
    n: { min: 20, max: 40 }, // Legume - low nitrogen required
    p: { min: 60, max: 80 },
    k: { min: 40, max: 60 },
    om: { min: 1.5, max: 3.5 },
    moisture: { min: 25, max: 40 },
    duration: '100 - 120 days',
    yieldPotential: '2.0 - 3.0 tons/ha',
    varieties: ['JS 335', 'JS 95-60', 'NRC 37', 'MACS 1407', 'JS 20-34'],
    careTips: [
      'Treat seeds with Rhizobium culture before sowing to enhance nitrogen fixation.',
      'Sow when there is sufficient moisture in the soil, but avoid waterlogged conditions.',
      'Control weed growth within the first 30 days to avoid yield losses.'
    ],
    description: 'A major oilseed and protein crop. As a legume, it fixes atmospheric nitrogen, reducing chemical nitrogen fertilizer needs.'
  },
  {
    name: 'Mustard',
    seasons: ['Rabi', 'Winter'],
    locations: ['Rajasthan', 'Haryana', 'Madhya Pradesh', 'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Punjab'],
    ph: { min: 6.0, max: 7.5 },
    n: { min: 60, max: 80 },
    p: { min: 30, max: 45 },
    k: { min: 20, max: 40 },
    om: { min: 1.0, max: 3.0 },
    moisture: { min: 15, max: 30 }, // Drought tolerant
    duration: '110 - 130 days',
    yieldPotential: '1.5 - 2.5 tons/ha',
    varieties: ['Pusa Bold', 'Kranti', 'RH 30', 'Varuna', 'Giriraj'],
    careTips: [
      'Requires cold climate and clear sunny weather during growth.',
      'Ensure sulphur fertilization (e.g. Gypsum) to increase oil content in seeds.',
      'Perform thinning 15-20 days after sowing to maintain spacing of 10-15 cm.'
    ],
    description: 'An important edible oilseed crop grown in winter. Highly drought-tolerant and suited to lighter sandy loam soils.'
  },
  {
    name: 'Groundnut (Peanut)',
    seasons: ['Kharif', 'Zaid'],
    locations: ['Gujarat', 'Andhra Pradesh', 'Tamil Nadu', 'Rajasthan', 'Karnataka', 'Maharashtra', 'Madhya Pradesh'],
    ph: { min: 6.0, max: 7.0 },
    n: { min: 20, max: 35 }, // Legume
    p: { min: 40, max: 60 },
    k: { min: 35, max: 50 },
    om: { min: 1.5, max: 3.5 },
    moisture: { min: 20, max: 35 },
    duration: '105 - 125 days',
    yieldPotential: '2.0 - 3.2 tons/ha',
    varieties: ['GG 20', 'TG 37A', 'Kadiri 6', 'JL 24', 'G201'],
    careTips: [
      'Apply Calcium (Gypsum 500 kg/ha at pegging stage) to ensure proper pod development and prevent empty shells (pops).',
      'Requires sandy loam, loose, friable soils so pegs can easily penetrate the ground.',
      'Avoid tillage or weed pulling after pegging has commenced.'
    ],
    description: 'An underground pod legume that acts as a valuable oilseed and soil replenisher. Needs warm temperatures and sandy soils.'
  },
  {
    name: 'Sugarcane',
    seasons: ['Kharif', 'Rabi', 'Monsoon'], // Annual crop, planted in multiple seasons
    locations: ['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Bihar', 'Gujarat', 'Andhra Pradesh', 'Punjab'],
    ph: { min: 6.0, max: 7.5 },
    n: { min: 150, max: 250 }, // Heavy feeder
    p: { min: 60, max: 90 },
    k: { min: 80, max: 130 },
    om: { min: 2.5, max: 6.0 },
    moisture: { min: 45, max: 70 },
    duration: '300 - 360 days', // Long duration
    yieldPotential: '70 - 100 tons/ha',
    varieties: ['Co 0238', 'Co 86032', 'Co 0118', 'CoJ 64', 'CoS 767'],
    careTips: [
      'Requires continuous hot and humid climate with plenty of water.',
      'Perform propping (tying stalks together) to prevent lodging (falling over) during high winds.',
      'Practice trash mulching to conserve moisture and suppress weeds.'
    ],
    description: 'A tall perennial grass cultivated for sugar production. Requires long warm weather, high irrigation, and fertile clayey loam.'
  }
];

interface MatchedCrop {
  crop: CropRequirement;
  score: number; // 0 to 100
  paramBreakdown: {
    ph: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
    n: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
    p: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
    k: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
    om: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
    moisture: { actual: number; idealMin: number; idealMax: number; status: 'Optimal' | 'Low' | 'High'; score: number };
  };
  seasonMatch: boolean;
  locationMatch: boolean;
  adjustments: string[];
}

export default function CropRecommendation() {
  // Form Inputs
  const [ph, setPh] = useState<number>(6.5);
  const [nitrogen, setNitrogen] = useState<number>(45);
  const [phosphorus, setPhosphorus] = useState<number>(30);
  const [potassium, setPotassium] = useState<number>(120);
  const [organicMatter, setOrganicMatter] = useState<number>(2.5);
  const [moisture, setMoisture] = useState<number>(35);
  const [location, setLocation] = useState<string>('');
  const [season, setSeason] = useState<string>('All');

  // Search state
  const [recommendations, setRecommendations] = useState<MatchedCrop[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  // Status for loading reports
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error' | null; message: string | null }>({ type: null, message: null });

  // Load latest soil report automatically on click
  const loadLatestSoilReport = async () => {
    setLoadingReport(true);
    setReportFeedback({ type: null, message: null });

    const isSupabaseConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder';

    let latestReport: any = null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('soil_reports')
          .select('*')
          .order('analyzed_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          latestReport = data[0];
        }
      } catch (err) {
        console.warn('Failed to load soil report from Supabase, checking local storage:', err);
      }
    }

    if (!latestReport) {
      // Check local storage
      const localReports = JSON.parse(localStorage.getItem('soil_reports') || '[]');
      if (localReports.length > 0) {
        latestReport = localReports[0];
      }
    }

    setLoadingReport(false);

    if (latestReport) {
      // Populate values (fill defaults for null values)
      setPh(latestReport.ph_level ?? 6.5);
      setNitrogen(latestReport.nitrogen ?? 40);
      setPhosphorus(latestReport.phosphorus ?? 25);
      setPotassium(latestReport.potassium ?? 150);
      setOrganicMatter(latestReport.organic_matter ?? 2.5);
      setMoisture(latestReport.moisture ?? 25);
      
      setReportFeedback({
        type: 'success',
        message: `Loaded report from ${new Date(latestReport.analyzed_at || Date.now()).toLocaleDateString()} successfully!`
      });
      setTimeout(() => setReportFeedback({ type: null, message: null }), 4000);
    } else {
      setReportFeedback({
        type: 'error',
        message: 'No saved soil reports found. Try using the Soil Analyzer first or fill manually.'
      });
      setTimeout(() => setReportFeedback({ type: null, message: null }), 4000);
    }
  };

  // Run the crop matching algorithm
  const runRecommendation = () => {
    setLoading(true);
    setExpandedCrop(null);
    
    // Simulate minor delay for aesthetic calculation feel
    setTimeout(() => {
      const results: MatchedCrop[] = CROP_DATABASE.map((crop) => {
        // Parameter matching logic: Calculate individual score (0 to 1) for each soil property
        const calculateParamScore = (actual: number, min: number, max: number, margin = 0.5) => {
          if (actual >= min && actual <= max) {
            return { score: 1, status: 'Optimal' as const };
          }
          if (actual < min) {
            const score = 1 - Math.min(1, (min - actual) / (min * margin));
            return { score, status: 'Low' as const };
          } else {
            const score = 1 - Math.min(1, (actual - max) / (max * margin));
            return { score, status: 'High' as const };
          }
        };

        const phMatch = calculateParamScore(ph, crop.ph.min, crop.ph.max, 0.3); // tighter margin for pH
        const nMatch = calculateParamScore(nitrogen, crop.n.min, crop.n.max, 0.6);
        const pMatch = calculateParamScore(phosphorus, crop.p.min, crop.p.max, 0.6);
        const kMatch = calculateParamScore(potassium, crop.k.min, crop.k.max, 0.6);
        const omMatch = calculateParamScore(organicMatter, crop.om.min, crop.om.max, 0.8);
        const moistureMatch = calculateParamScore(moisture, crop.moisture.min, crop.moisture.max, 0.6);

        // Season check
        const isAnySeason = season === 'All';
        const seasonMatch = isAnySeason || crop.seasons.some(s => s.toLowerCase() === season.toLowerCase());

        // Location check
        const locationMatch = !location.trim() || crop.locations.some(loc => 
          loc.toLowerCase().includes(location.trim().toLowerCase()) ||
          location.trim().toLowerCase().includes(loc.toLowerCase())
        );

        // Weighted Average Soil Score
        // pH: 20%, N: 15%, P: 15%, K: 15%, moisture: 15%, OM: 10%, Location: 10%
        const soilScore = (
          phMatch.score * 0.20 +
          nMatch.score * 0.15 +
          pMatch.score * 0.15 +
          kMatch.score * 0.15 +
          moistureMatch.score * 0.15 +
          omMatch.score * 0.10 +
          (locationMatch ? 1.0 : 0.4) * 0.10 // location match weighting
        ) * 100;

        // Apply severe penalty if season is selected and is NOT a match
        let finalScore = soilScore;
        if (!seasonMatch) {
          finalScore = soilScore * 0.5; // 50% penalty for wrong season
        }

        // Generate tailored fertilizer/soil adjustment tips
        const adjustments: string[] = [];
        if (phMatch.status === 'Low') {
          adjustments.push(`Your soil pH (${ph}) is too acidic. Apply agricultural lime (calcium carbonate) or dolomite to raise the pH to the ideal range of ${crop.ph.min}-${crop.ph.max}.`);
        } else if (phMatch.status === 'High') {
          adjustments.push(`Your soil pH (${ph}) is too alkaline. Incorporate agricultural sulfur, gypsum, or organic mulches to lower the pH to the ideal range of ${crop.ph.min}-${crop.ph.max}.`);
        }

        if (nMatch.status === 'Low') {
          const gap = crop.n.min - nitrogen;
          adjustments.push(`Nitrogen is low. Apply Nitrogen-rich fertilizers (e.g. Urea or Ammonium Sulfate) to bridge the gap of approx ${gap} kg/ha, or add compost.`);
        }
        if (pMatch.status === 'Low') {
          const gap = crop.p.min - phosphorus;
          adjustments.push(`Phosphorus is low. Incorporate Single Super Phosphate (SSP) or Diammonium Phosphate (DAP) to add approx ${gap} kg/ha for better root development.`);
        }
        if (kMatch.status === 'Low') {
          const gap = crop.k.min - potassium;
          adjustments.push(`Potassium is low. Apply Muriate of Potash (MOP) to supply approx ${gap} kg/ha to improve fruit quality and pest resistance.`);
        }

        if (moistureMatch.status === 'Low') {
          adjustments.push(`Moisture is below ideal (${crop.moisture.min}%). Implement light irrigation or drip watering. Mulch around plants to retain water.`);
        } else if (moistureMatch.status === 'High') {
          adjustments.push(`Moisture exceeds ideal (${crop.moisture.max}%). Enhance field drainage, avoid overhead watering, and monitor for fungal infections.`);
        }

        if (crop.name.includes('Soybean') || crop.name.includes('Groundnut')) {
          adjustments.push(`As a legume, this crop fixes nitrogen. Focus on Phosphatic fertilizers and treat seeds with Rhizobium inoculant rather than adding high chemical Nitrogen.`);
        }

        return {
          crop,
          score: Math.round(finalScore),
          paramBreakdown: {
            ph: { actual: ph, idealMin: crop.ph.min, idealMax: crop.ph.max, status: phMatch.status, score: phMatch.score },
            n: { actual: nitrogen, idealMin: crop.n.min, idealMax: crop.n.max, status: nMatch.status, score: nMatch.score },
            p: { actual: phosphorus, idealMin: crop.p.min, idealMax: crop.p.max, status: pMatch.status, score: pMatch.score },
            k: { actual: potassium, idealMin: crop.k.min, idealMax: crop.k.max, status: kMatch.status, score: kMatch.score },
            om: { actual: organicMatter, idealMin: crop.om.min, idealMax: crop.om.max, status: omMatch.status, score: omMatch.score },
            moisture: { actual: moisture, idealMin: crop.moisture.min, idealMax: crop.moisture.max, status: moistureMatch.status, score: moistureMatch.score },
          },
          seasonMatch,
          locationMatch,
          adjustments
        };
      })
      .sort((a, b) => b.score - a.score); // Sort by compatibility

      setRecommendations(results);
      setLoading(false);
      setSearched(true);
    }, 600);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return { text: 'text-emerald-600', border: 'border-emerald-500', bg: 'bg-emerald-50', fill: '#10b981', ring: 'stroke-emerald-500' };
    if (score >= 60) return { text: 'text-amber-600', border: 'border-amber-500', bg: 'bg-amber-50', fill: '#f59e0b', ring: 'stroke-amber-500' };
    return { text: 'text-rose-600', border: 'border-rose-500', bg: 'bg-rose-50', fill: '#f43f5e', ring: 'stroke-rose-500' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-600 to-green-700 rounded-lg sm:rounded-xl shadow-lg">
              <Wheat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Crop Recommendation</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Match agricultural crops to your soil profile and climate conditions
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inputs Section (Left Column) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.3 }} 
            className="lg:col-span-5 space-y-6"
          >
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> Soil Profile & Climate
                </h2>
                
                {/* Integration Button */}
                <button 
                  onClick={loadLatestSoilReport}
                  disabled={loadingReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100 disabled:opacity-50 touch-target"
                >
                  {loadingReport ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Load Latest Report
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                
                {/* Report Loading Feedback */}
                <AnimatePresence>
                  {reportFeedback.message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                        reportFeedback.type === 'success'
                          ? 'bg-green-50 border-green-100 text-green-800'
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}
                    >
                      {reportFeedback.type === 'success' ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{reportFeedback.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* pH Level */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Thermometer className="w-4 h-4 text-blue-500" /> Soil pH Level
                    </label>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{ph.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="0.1"
                    value={ph}
                    onChange={(e) => setPh(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0 (Acidic)</span>
                    <span>7 (Neutral)</span>
                    <span>14 (Alkaline)</span>
                  </div>
                </div>

                {/* Nitrogen (N) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Sprout className="w-4 h-4 text-green-600" /> Nitrogen (N) <span className="text-[10px] text-gray-400 font-normal">(kg/ha)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={nitrogen}
                        onChange={(e) => setNitrogen(Math.max(0, Math.min(300, parseInt(e.target.value) || 0)))}
                        className="w-16 text-right text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    value={nitrogen}
                    onChange={(e) => setNitrogen(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Phosphorus (P) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" /> Phosphorus (P) <span className="text-[10px] text-gray-400 font-normal">(kg/ha)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={phosphorus}
                        onChange={(e) => setPhosphorus(Math.max(0, Math.min(300, parseInt(e.target.value) || 0)))}
                        className="w-16 text-right text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    value={phosphorus}
                    onChange={(e) => setPhosphorus(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Potassium (K) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Leaf className="w-4 h-4 text-orange-500" /> Potassium (K) <span className="text-[10px] text-gray-400 font-normal">(kg/ha)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={potassium}
                        onChange={(e) => setPotassium(Math.max(0, Math.min(300, parseInt(e.target.value) || 0)))}
                        className="w-16 text-right text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    value={potassium}
                    onChange={(e) => setPotassium(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Organic Matter */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 block">
                      Organic Matter (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={organicMatter}
                        onChange={(e) => setOrganicMatter(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))}
                        className="w-16 text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-gray-500">Max 10%</span>
                    </div>
                  </div>

                  {/* Moisture Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Moisture (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={moisture}
                        onChange={(e) => setMoisture(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-16 text-xs sm:text-sm font-bold text-gray-900 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-gray-500">Max 100%</span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Season Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Target Season
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
                    {['All', 'Kharif', 'Rabi', 'Zaid'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeason(s)}
                        className={`py-1.5 text-center text-xs font-semibold rounded-md transition-all ${
                          season === s
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Input */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-rose-500" /> Farm Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter state/region (e.g. Punjab, Gujarat, Tamil Nadu)"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-[10px] text-gray-400">Optional: Used to tailor geographic suitability</p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    onClick={runRecommendation}
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        Analyzing Soil Matches...
                      </>
                    ) : (
                      <>
                        <Wheat className="w-4 h-4 sm:w-5 sm:h-5" />
                        Generate Crop Recommendations
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </motion.div>

          {/* Results Section (Right Column) */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              
              {/* Initial State */}
              {!searched && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Sprout className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Find Suitable Crops</h3>
                  <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto mb-6">
                    Fill in your soil test parameters, location, and seasonal goals. Our engine will check chemical boundaries and match compatibility levels.
                  </p>
                  <button
                    onClick={runRecommendation}
                    className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-xs sm:text-sm hover:bg-emerald-100 transition-colors border border-emerald-200 touch-target"
                  >
                    Use Sample Recommendations
                  </button>
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-12 text-center"
                >
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold">Running crop diagnostics...</p>
                  <p className="text-gray-400 text-xs mt-1">Comparing input ranges with biological tolerances</p>
                </motion.div>
              )}

              {/* Results Found */}
              {searched && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {recommendations.length} Potential Crops Identified
                    </h3>
                    <span className="text-xs text-gray-500">Sorted by Compatibility</span>
                  </div>

                  <div className="space-y-4">
                    {recommendations.map((item) => {
                      const colorTokens = getScoreColor(item.score);
                      const isExpanded = expandedCrop === item.crop.name;

                      return (
                        <div
                          key={item.crop.name}
                          className="bg-white rounded-xl sm:rounded-2xl border border-gray-150 hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {/* Card Summary Header */}
                          <div
                            onClick={() => setExpandedCrop(isExpanded ? null : item.crop.name)}
                            className="p-4 sm:p-5 flex items-center gap-3 cursor-pointer select-none"
                          >
                            {/* Compatibility Circle */}
                            <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
                              <svg className="w-14 h-14 transform -rotate-90">
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="23"
                                  className="stroke-gray-100 fill-none"
                                  strokeWidth="3.5"
                                />
                                <circle
                                  cx="28"
                                  cy="28"
                                  r="23"
                                  className={`fill-none ${colorTokens.ring} transition-all duration-500`}
                                  strokeWidth="3.5"
                                  strokeDasharray={2 * Math.PI * 23}
                                  strokeDashoffset={2 * Math.PI * 23 * (1 - item.score / 100)}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[13px] font-bold text-gray-900 leading-none">{item.score}%</span>
                                <span className="text-[7px] font-medium text-gray-400 uppercase tracking-wide">Match</span>
                              </div>
                            </div>

                            {/* Crop info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                  {item.crop.name}
                                </h4>
                                {!item.seasonMatch && (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Season Mismatch
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                                <span className="flex items-center gap-0.5 text-emerald-600"><Calendar className="w-3 h-3" /> {item.crop.seasons.join(', ')}</span>
                                <span className="text-gray-300">•</span>
                                <span>{item.crop.duration}</span>
                              </p>
                            </div>

                            <button className="p-1 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </div>

                          {/* Expandable detailed drawer */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="border-t border-gray-100 bg-gray-50/70 overflow-hidden"
                              >
                                <div className="p-4 sm:p-6 space-y-5">
                                  
                                  {/* Description */}
                                  <div>
                                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                                      {item.crop.description}
                                    </p>
                                  </div>

                                  {/* Visual Parameters Comparison */}
                                  <div className="space-y-3">
                                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                      Soil Chemistry Fit
                                    </h5>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 bg-white p-4 rounded-xl border border-gray-150">
                                      
                                      {/* pH Bar */}
                                      <ParameterBar
                                        label="Soil pH"
                                        actual={item.paramBreakdown.ph.actual}
                                        min={0}
                                        max={14}
                                        idealMin={item.paramBreakdown.ph.idealMin}
                                        idealMax={item.paramBreakdown.ph.idealMax}
                                        status={item.paramBreakdown.ph.status}
                                        unit=""
                                      />

                                      {/* Nitrogen Bar */}
                                      <ParameterBar
                                        label="Nitrogen (N)"
                                        actual={item.paramBreakdown.n.actual}
                                        min={0}
                                        max={300}
                                        idealMin={item.paramBreakdown.n.idealMin}
                                        idealMax={item.paramBreakdown.n.idealMax}
                                        status={item.paramBreakdown.n.status}
                                        unit="kg/ha"
                                      />

                                      {/* Phosphorus Bar */}
                                      <ParameterBar
                                        label="Phosphorus (P)"
                                        actual={item.paramBreakdown.p.actual}
                                        min={0}
                                        max={200}
                                        idealMin={item.paramBreakdown.p.idealMin}
                                        idealMax={item.paramBreakdown.p.idealMax}
                                        status={item.paramBreakdown.p.status}
                                        unit="kg/ha"
                                      />

                                      {/* Potassium Bar */}
                                      <ParameterBar
                                        label="Potassium (K)"
                                        actual={item.paramBreakdown.k.actual}
                                        min={0}
                                        max={300}
                                        idealMin={item.paramBreakdown.k.idealMin}
                                        idealMax={item.paramBreakdown.k.idealMax}
                                        status={item.paramBreakdown.k.status}
                                        unit="kg/ha"
                                      />

                                      {/* Moisture Bar */}
                                      <ParameterBar
                                        label="Moisture Content"
                                        actual={item.paramBreakdown.moisture.actual}
                                        min={0}
                                        max={100}
                                        idealMin={item.paramBreakdown.moisture.idealMin}
                                        idealMax={item.paramBreakdown.moisture.idealMax}
                                        status={item.paramBreakdown.moisture.status}
                                        unit="%"
                                      />

                                      {/* Organic Matter Bar */}
                                      <ParameterBar
                                        label="Organic Matter"
                                        actual={item.paramBreakdown.om.actual}
                                        min={0}
                                        max={10}
                                        idealMin={item.paramBreakdown.om.idealMin}
                                        idealMax={item.paramBreakdown.om.idealMax}
                                        status={item.paramBreakdown.om.status}
                                        unit="%"
                                      />

                                    </div>
                                  </div>

                                  {/* Geographic suitability warning */}
                                  {!item.locationMatch && location.trim() && (
                                    <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800 font-medium">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-bold">Regional Cultivation Check</p>
                                        <p className="text-[11px] text-amber-700 mt-0.5">
                                          {item.crop.name} is not typically grown commercially in "{location}". Ideal cultivation locations include: {item.crop.locations.slice(0, 5).join(', ')}.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Required Soil Adjustments (Actionable Tips) */}
                                  <div className="space-y-2.5">
                                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Fertilizer & Treatment Adjustments
                                    </h5>
                                    
                                    {item.adjustments.length > 0 ? (
                                      <ul className="space-y-2 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 text-xs leading-relaxed text-emerald-900 font-medium">
                                        {item.adjustments.map((tip, idx) => (
                                          <li key={idx} className="flex gap-2 items-start">
                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <span>{tip}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3 border border-green-150 text-xs text-green-800 font-semibold">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <span>Excellent soil match! No chemistry amendments needed.</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Varieties and Crop Stats */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-xl p-4 border border-gray-150 text-xs space-y-2">
                                      <h6 className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                                        Recommended Seed Varieties
                                      </h6>
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {item.crop.varieties.map((v) => (
                                          <span
                                            key={v}
                                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold text-[10px]"
                                          >
                                            {v}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-[10px] text-gray-500 pt-1">
                                        Est. Yield: <strong>{item.crop.yieldPotential}</strong>
                                      </p>
                                    </div>

                                    <div className="bg-white rounded-xl p-4 border border-gray-150 text-xs space-y-1.5">
                                      <h6 className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                                        Quick Sowing Guidance
                                      </h6>
                                      <ul className="space-y-1 text-gray-600 list-disc pl-4 text-[11px] font-medium leading-normal">
                                        {item.crop.careTips.map((tip, idx) => (
                                          <li key={idx}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}

interface ParameterBarProps {
  label: string;
  actual: number;
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  status: 'Optimal' | 'Low' | 'High';
  unit: string;
}

function ParameterBar({ label, actual, min, max, idealMin, idealMax, status, unit }: ParameterBarProps) {
  // Normalize percentage for the position coordinates on the bar
  const toPercent = (val: number) => {
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  };

  const actualPct = toPercent(actual);
  const idealMinPct = toPercent(idealMin);
  const idealMaxPct = toPercent(idealMax);
  const rangeWidth = idealMaxPct - idealMinPct;

  const getStatusColor = (s: 'Optimal' | 'Low' | 'High') => {
    switch (s) {
      case 'Optimal': return { text: 'text-emerald-600', bg: 'bg-emerald-500' };
      case 'Low': return { text: 'text-amber-600', bg: 'bg-amber-500' };
      case 'High': return { text: 'text-orange-600', bg: 'bg-orange-500' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <div className="space-y-1.5 py-1 text-xs">
      <div className="flex justify-between items-center text-[11px] font-medium text-gray-700">
        <span>{label}</span>
        <span className="font-bold">
          Actual: <span className={colors.text}>{actual}{unit}</span> 
          <span className="text-gray-400 font-normal ml-1.5">
            (Ideal: {idealMin}-{idealMax}{unit})
          </span>
        </span>
      </div>

      {/* Graphical Range Bar */}
      <div className="relative w-full h-3 bg-gray-100 rounded-full border border-gray-150 overflow-visible">
        {/* Ideal range highlighted box */}
        <div
          className="absolute h-full bg-emerald-100 opacity-80 border-x border-emerald-200/50"
          style={{ left: `${idealMinPct}%`, width: `${rangeWidth}%` }}
        />

        {/* Marker for Actual Value */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${colors.bg} shadow-md border-2 border-white transition-all duration-300 z-10`}
          style={{ left: `${actualPct}%` }}
          title={`${label}: ${actual}`}
        />
      </div>

      <div className="flex justify-between text-[8px] text-gray-400 px-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
