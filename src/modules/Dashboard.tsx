import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  LayoutDashboard, Sprout, Droplets, TrendingUp, AlertTriangle,
  CheckCircle, Thermometer, Tractor, Wheat, Leaf
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type FarmParcel, type YieldRecord, type CropDisease, type SoilReport } from '../lib/types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface DashboardData {
  parcels: FarmParcel[];
  yields: YieldRecord[];
  diseases: CropDisease[];
  soils: SoilReport[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ parcels: [], yields: [], diseases: [], soils: [] });
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      let parcels: any[] = [];
      let yields: any[] = [];
      let diseases: any[] = [];
      let soils: any[] = [];

      const isSupabaseConfigured =
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
        import.meta.env.VITE_SUPABASE_ANON_KEY &&
        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder';

      if (isSupabaseConfigured) {
        try {
          const [parcelsRes, yieldsRes, diseasesRes, soilsRes] = await Promise.all([
            supabase.from('farm_parcels').select('*'),
            supabase.from('yield_records').select('*'),
            supabase.from('crop_diseases').select('*').order('detected_at', { ascending: false }).limit(10),
            supabase.from('soil_reports').select('*').order('analyzed_at', { ascending: false }).limit(10),
          ]);
          parcels = parcelsRes.data || [];
          yields = yieldsRes.data || [];
          diseases = diseasesRes.data || [];
          soils = soilsRes.data || [];
        } catch (e) {
          console.warn("Supabase fetch failed, loading local/mock data instead", e);
        }
      }

      // Add local storage fallback
      const localSoils = JSON.parse(localStorage.getItem('soil_reports') || '[]');
      const localDiseases = JSON.parse(localStorage.getItem('crop_diseases') || '[]');

      const mockParcels = [
        { id: '1', name: 'North Field', crop_type: 'Wheat', area_hectares: 12.5 },
        { id: '2', name: 'East Field', crop_type: 'Rice', area_hectares: 8.2 },
        { id: '3', name: 'Hillside', crop_type: 'Tomato', area_hectares: 4.5 },
        { id: '4', name: 'Valley Farm', crop_type: 'Soybean', area_hectares: 15.0 },
      ];
      const mockYields = [
        { id: '1', parcel_id: '1', year: 2024, season: 'Rabi', yield_tons: 45.2, rainfall_mm: 650 },
        { id: '2', parcel_id: '2', year: 2024, season: 'Kharif', yield_tons: 32.8, rainfall_mm: 1200 },
        { id: '3', parcel_id: '3', year: 2024, season: 'Zaid', yield_tons: 15.4, rainfall_mm: 300 },
        { id: '4', parcel_id: '4', year: 2024, season: 'Kharif', yield_tons: 50.1, rainfall_mm: 1100 },
      ];

      setData({
        parcels: parcels.length > 0 ? parcels : mockParcels,
        yields: yields.length > 0 ? yields : mockYields,
        diseases: [...diseases, ...localDiseases].slice(0, 10),
        soils: [...soils, ...localSoils].slice(0, 10),
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  const totalArea = data.parcels.reduce((s, p) => s + p.area_hectares, 0);
  const totalYield = data.yields.reduce((s, y) => s + y.yield_tons, 0);
  const activeDiseases = data.diseases.filter(d => d.severity !== 'Healthy').length;
  const healthyDiseases = data.diseases.filter(d => d.severity === 'Healthy').length;

  const cropDistribution = data.parcels.reduce((acc, p) => {
    acc[p.crop_type] = (acc[p.crop_type] || 0) + p.area_hectares;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(cropDistribution).map(([name, value]) => ({ name, value }));

  const yieldByYear = data.yields.reduce((acc, y) => {
    acc[y.year] = (acc[y.year] || 0) + y.yield_tons;
    return acc;
  }, {} as Record<number, number>);
  const lineData = Object.entries(yieldByYear).map(([year, yield_tons]) => ({ period: String(year), yield_tons })).sort((a, b) => a.period.localeCompare(b.period));

  const yieldByParcel = data.parcels.map(p => {
    const parcelYields = data.yields.filter(y => y.parcel_id === p.id);
    const latest = parcelYields[parcelYields.length - 1];
    return { name: p.name, yield: latest?.yield_tons || 0, crop: p.crop_type };
  });

  const filteredYields = selectedParcel === 'all' ? data.yields : data.yields.filter(y => y.parcel_id === selectedParcel);
  const filteredYieldTrend = filteredYields.reduce((acc, y) => {
    const key = `${y.year} ${y.season}`;
    acc[key] = (acc[key] || 0) + y.yield_tons;
    return acc;
  }, {} as Record<string, number>);
  const trendData = Object.entries(filteredYieldTrend).map(([period, yield_tons]) => ({ period, yield_tons }));

  const stats = [
    { label: 'Total Area', value: `${totalArea.toFixed(1)} ha`, icon: <Tractor className="w-6 h-6" />, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Total Yield', value: `${totalYield.toFixed(1)} t`, icon: <Wheat className="w-6 h-6" />, color: 'bg-blue-500', text: 'text-blue-600' },
    { label: 'Active Issues', value: `${activeDiseases}`, icon: <AlertTriangle className="w-6 h-6" />, color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Healthy Checks', value: `${healthyDiseases}`, icon: <CheckCircle className="w-6 h-6" />, color: 'bg-emerald-500', text: 'text-emerald-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading farm data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-slate-700 to-gray-800 rounded-lg sm:rounded-xl shadow-lg">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Farm Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Real-time overview of your farm operations</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }} className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100 p-3 sm:p-5">
              <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                <div className={`w-9 h-9 sm:w-12 sm:h-12 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm`}>{stat.icon}</div>
                <span className={`text-lg sm:text-2xl font-bold ${stat.text}`}>{stat.value}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Yield Trend</h3>
                <select value={selectedParcel} onChange={(e) => setSelectedParcel(e.target.value)} className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Parcels</option>
                  {data.parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
                <AreaChart data={trendData.length > 0 ? trendData : lineData}>
                  <defs>
                    <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="yield_tons" stroke="#3b82f6" strokeWidth={2} fill="url(#yieldGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2"><Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> Crop Distribution</h3>
              <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 justify-center">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs sm:text-sm text-gray-600">{entry.name} ({entry.value} ha)</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">Yield by Parcel</h3>
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[260px]">
                <BarChart data={yieldByParcel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="yield" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2"><Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Rainfall vs Yield</h3>
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[260px]">
                <LineChart data={data.yields}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="year" stroke="#9ca3af" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line yAxisId="left" type="monotone" dataKey="yield_tons" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="rainfall_mm" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-3 sm:gap-4 justify-center mt-2">
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500" /><span className="text-[10px] sm:text-xs text-gray-500">Yield (tons)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-cyan-500 border-dashed" style={{ borderTop: '2px dashed #06b6d4' }} /><span className="text-[10px] sm:text-xs text-gray-500">Rainfall (mm)</span></div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> Recent Detections</h3>
              </div>
              <div className="p-3 sm:p-4">
                {data.diseases.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {data.diseases.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${d.severity === 'Healthy' ? 'bg-emerald-100' : d.severity === 'Severe' ? 'bg-red-100' : 'bg-amber-100'}`}>
                          {d.severity === 'Healthy' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{d.detected_disease}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{d.severity} - {d.confidence}%</p>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">{new Date(d.detected_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">No disease detections yet</p>}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><Thermometer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> Recent Soil Analyses</h3>
              </div>
              <div className="p-3 sm:p-4">
                {data.soils.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {data.soils.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm">pH: {s.ph_level} | N: {s.nitrogen} | P: {s.phosphorus} | K: {s.potassium}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{s.texture} - {s.moisture}% moisture</p>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">{new Date(s.analyzed_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">No soil analyses yet</p>}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-4 sm:mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Quick Actions</h3>
              <p className="text-emerald-100 text-xs sm:text-sm">Access all farm management tools</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <a href="/disease" className="px-3 py-2 sm:px-5 sm:py-3 bg-white/20 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5 sm:gap-2"><Leaf className="w-4 h-4 sm:w-5 sm:h-5" /> Disease Check</a>
              <a href="/soil" className="px-3 py-2 sm:px-5 sm:py-3 bg-white/20 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5 sm:gap-2"><Droplets className="w-4 h-4 sm:w-5 sm:h-5" /> Soil Analysis</a>
              <a href="/crop" className="px-3 py-2 sm:px-5 sm:py-3 bg-white/20 rounded-lg sm:rounded-xl text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5 sm:gap-2"><Wheat className="w-4 h-4 sm:w-5 sm:h-5" /> Crop Recommend</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
