export interface FarmParcel {
  id: string;
  name: string;
  area_hectares: number;
  crop_type: string;
  soil_type: string | null;
  location: string | null;
  created_at: string;
}

export interface CropDisease {
  id: string;
  parcel_id: string | null;
  image_url: string | null;
  detected_disease: string;
  confidence: number;
  severity: string;
  recommended_treatment: string | null;
  detected_at: string;
}

export interface SoilReport {
  id: string;
  parcel_id: string | null;
  raw_text: string;
  ph_level: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organic_matter: number | null;
  moisture: number | null;
  texture: string | null;
  recommendations: string | null;
  analyzed_at: string;
}

export interface YieldRecord {
  id: string;
  parcel_id: string;
  year: number;
  season: string;
  yield_tons: number;
  rainfall_mm: number | null;
  fertilizer_used_kg: number | null;
  seed_variety: string | null;
  created_at: string;
}

export interface DiseaseKnowledge {
  id: string;
  name: string;
  crop_affected: string;
  symptoms: string;
  causes: string | null;
  treatment: string;
  prevention: string | null;
  image_url: string | null;
}

export interface DiseaseDetectionResult {
  disease: string;
  confidence: number;
  severity: string;
  treatment: string;
  symptoms: string;
  crop: string;
}

export interface SoilAnalysisResult {
  ph_level: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organic_matter: number;
  moisture: number;
  texture: string;
  recommendations: string;
  fertility_score: number;
}

export interface YieldPrediction {
  predictedYield: number;
  confidence: number;
  factors: string[];
  trend: 'up' | 'down' | 'stable';
}
