import React, { useState } from 'react';
import type { NetworkStage } from '../types/network';
import { STAGE_EXPLANATIONS } from '../simulation/networkGraph';
import { Info, ChevronDown, ChevronUp, Cpu, Wifi, Globe, Server, Award } from 'lucide-react';

interface StageExplanationProps {
  stage: NetworkStage | 'packetizing' | 'delivered';
}

export const StageExplanation: React.FC<StageExplanationProps> = ({ stage }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const stageInfo = STAGE_EXPLANATIONS[stage] || STAGE_EXPLANATIONS.device;

  const renderIcon = () => {
    switch (stage) {
      case 'device':
      case 'packetizing':
        return <Cpu className="w-5 h-5 text-cyan-400" />;
      case 'router':
        return <Wifi className="w-5 h-5 text-sky-400" />;
      case 'internet':
        return <Globe className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '12s' }} />;
      case 'datacenter':
        return <Server className="w-5 h-5 text-emerald-400" />;
      case 'destination':
      case 'delivered':
        return <Award className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <section
      id="stage-explanation-section"
      aria-label="Educational Stage Explanation"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8"
    >
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              {renderIcon()}
            </span>
            <div>
              <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                STAGE NARRATION &amp; INSIGHTS
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {stageInfo.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            aria-expanded={showTechnicalDetails}
          >
            <span>{showTechnicalDetails ? 'Less Detail' : 'Deep Dive'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Layman Short Description */}
        <p className="text-base text-slate-200 font-normal leading-relaxed pl-1">
          {stageInfo.shortDescription}
        </p>

        {/* Collapsible Deep Dive */}
        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 p-4 rounded-2xl border animate-fade-in">
            <div className="text-xs font-mono font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> TECHNICAL UNDER-THE-HOOD:
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {stageInfo.deepExplanation}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
