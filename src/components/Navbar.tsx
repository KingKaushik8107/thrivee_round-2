import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  Search,
  Flame,
  Activity,
  Cpu,
  Radio
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'investigate' | 'campaigns' | 'model' | 'history';
  onSelectTab: (tab: 'dashboard' | 'investigate' | 'campaigns' | 'model' | 'history') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab
}) => {
  const navItems = [
    { id: 'dashboard', label: 'SOC Dashboard', icon: LayoutDashboard },
    { id: 'investigate', label: 'Email Investigation', icon: Search, badge: 'Live' },
    { id: 'campaigns', label: 'Phishing Campaigns', icon: Flame },
    { id: 'history', label: 'Incident Queue', icon: Activity },
    { id: 'model', label: 'ML Model Health', icon: Cpu },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="p-2 bg-gradient-to-br from-red-500 to-amber-600 rounded-lg shadow-md shadow-red-500/20 text-white flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-wider font-mono">PhishX</span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-red-950/80 text-red-400 border border-red-800/60 rounded">
                  SOC DEFENSE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                AI-Powered Phishing Investigation & SOC Response Platform
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 rounded-full border border-red-500/40">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status Indicators */}
          <div className="hidden lg:flex items-center space-x-4 pl-4 border-l border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-400 font-mono">ANALYZER READY</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>TI: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
