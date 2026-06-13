import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Scan, FlaskConical, Menu, X, Sprout, Wheat } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/disease', label: 'Disease Detection', icon: <Scan className="w-5 h-5" /> },
  { path: '/soil', label: 'Soil Analysis', icon: <FlaskConical className="w-5 h-5" /> },
  { path: '/crop', label: 'Crop Recommend', icon: <Wheat className="w-5 h-5" /> },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-200 z-40">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm leading-tight">Smart Farming</h2>
              <p className="text-xs text-gray-500">Automation</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-800 mb-1">Farm Status</p>
            <p className="text-xs text-emerald-600">All systems operational</p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex items-center justify-between px-4 safe-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-green-700 rounded-lg flex items-center justify-center">
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Smart Farming</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors touch-target"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[64px] transition-colors ${
                  isActive
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }`
              }
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile slide-out menu (overlay) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-xl"
            >
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                    <Sprout className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">Smart Farming</h2>
                    <p className="text-xs text-gray-500">Automation</p>
                  </div>
                </div>
              </div>
              <nav className="p-3 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-colors touch-target ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Farm Status</p>
                  <p className="text-xs text-emerald-600">All systems operational</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
