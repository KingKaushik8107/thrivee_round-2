import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { DemoScenario } from '../types';
import { getDemoSamples } from '../services/api';

interface DemoSelectorProps {
  onSelectScenario: (scenario: DemoScenario) => void;
}

export const DemoSelector: React.FC<DemoSelectorProps> = ({ onSelectScenario }) => {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const samples = await getDemoSamples();
        setScenarios(samples);
        if (samples.length > 0) {
          setSelectedId(samples[0].id);
        }
      } catch (e) {
        console.error('Error fetching demo samples:', e);
      }
    };
    fetchSamples();
  }, []);

  const handleSelect = (scenarioId: string) => {
    setSelectedId(scenarioId);
    const found = scenarios.find(s => s.id === scenarioId);
    if (found) {
      onSelectScenario(found);
    }
  };

  const getCategoryColor = (cat: string) => {
    if (cat.includes('Critical')) return 'bg-red-950/80 text-red-400 border-red-800/80';
    if (cat.includes('Malware')) return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
    if (cat.includes('BEC')) return 'bg-orange-950/80 text-orange-400 border-orange-800/80';
    if (cat.includes('Campaign')) return 'bg-purple-950/80 text-purple-400 border-purple-800/80';
    if (cat.includes('Benign')) return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2 text-slate-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold font-mono uppercase tracking-wide">
            LOAD VERIFIED DEMO SCENARIO
          </h3>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          1-Click Security Scenarios
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {scenarios.map((s) => {
          const isSelected = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-150 relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border mb-1.5 ${getCategoryColor(s.category)}`}>
                  {s.category}
                </span>
                <div className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                  {s.name}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono truncate mt-2">
                From: {s.sender}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
