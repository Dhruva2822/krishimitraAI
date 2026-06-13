import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './modules/Dashboard';
import DiseaseDetection from './modules/DiseaseDetection';
import SoilAnalyzer from './modules/SoilAnalyzer';
import CropRecommendation from './modules/CropRecommendation';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Navigation />
        <main className="flex-1 lg:ml-64 pt-14 pb-16 lg:pt-0 lg:pb-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/disease" element={<DiseaseDetection />} />
            <Route path="/soil" element={<SoilAnalyzer />} />
            <Route path="/crop" element={<CropRecommendation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
