import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { Indicator, Severity } from '../types';

interface IndicatorBadgeProps {
  indicators: Indicator[];
}

export const IndicatorBadge: React.FC<IndicatorBadgeProps> = ({ indicators }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!indicators || indicators.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <Info className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
        <p className="text-sm font-semibold text-slate-300">Clean Forensic Scan</p>
        <p className="text-xs text-slate-400 mt-1">No adverse security indicators fired for this email.</p>
      </div>
    );
  }

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case 'critical':
        return {
          bg: 'bg-red-950/70 border-red-800/80 text-red-400',
          icon: ShieldAlert,
          label: 'CRITICAL'
        };
      case 'high':
        return {
          bg: 'bg-orange-950/70 border-orange-800/80 text-orange-400',
          icon: AlertTriangle,
          label: 'HIGH'
        };
      case 'medium':
        return {
          bg: 'bg-amber-950/70 border-amber-800/80 text-amber-400',
          icon: AlertCircle,
          label: 'MEDIUM'
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: Info,
          label: 'LOW'
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-2">
          <span>Forensic Indicators Fired</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700">
            {indicators.length}
          </span>
        </h3>
      </div>

      <div className="space-y-2.5">
        {indicators.map((ind, idx) => {
          const id = ind.id || `ind-${idx}`;
          const isExpanded = expandedId === id;
          const config = getSeverityBadge(ind.severity);
          const Icon = config.icon;

          return (
            <div
              key={id}
              className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                isExpanded ? 'bg-slate-900 border-slate-700 shadow-md' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : id)}
                className="p-3.5 flex items-start justify-between cursor-pointer select-none space-x-3"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-1.5 rounded-md border mt-0.5 ${config.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${config.bg}`}>
                        {config.label}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-white">
                        {ind.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-1 line-clamp-2">
                      {ind.evidence}
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 pt-1">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/40 text-xs space-y-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 font-mono">
                      Technical Security Context:
                    </span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">
                      {ind.description || 'This indicator signifies anomalous patterns aligned with known phishing and evasion techniques.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                    <span>Source Engine: <strong className="text-slate-300">{ind.source.replace(/_/g, ' ')}</strong></span>
                    <span>Code: <code className="text-amber-400 bg-slate-800 px-1 py-0.2 rounded">{ind.indicator_code}</code></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
