import React from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';

import type { XAIThreatIntelEvidence } from '../../types';

interface ThreatIntelEvidencePanelProps {
  threatIntelList?: XAIThreatIntelEvidence[];
}

export const ThreatIntelEvidencePanel: React.FC<ThreatIntelEvidencePanelProps> = ({
  threatIntelList = []
}) => {
  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'malicious') {
      return (
        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3" />
          <span>MALICIOUS</span>
        </span>
      );
    }
    if (s === 'suspicious') {
      return (
        <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>SUSPICIOUS</span>
        </span>
      );
    }
    if (s === 'clean') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3" />
          <span>CLEAN</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold font-mono flex items-center space-x-1">
        <HelpCircle className="w-3 h-3" />
        <span>UNKNOWN</span>
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-slate-200">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            THREAT INTELLIGENCE EVIDENCE (TI)
          </h3>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          VirusTotal &bull; URLhaus &bull; AbuseIPDB
        </div>
      </div>

      {/* Threat Intel Findings List */}
      <div className="space-y-2.5">
        {threatIntelList && threatIntelList.length > 0 ? (
          threatIntelList.map((ti, idx) => (
            <div
              key={idx}
              className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs font-mono space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                    {ti.ioc_type}
                  </span>
                  <span className="text-white font-bold truncate max-w-xs sm:max-w-md">
                    {ti.ioc_value}
                  </span>
                </div>
                {getStatusBadge(ti.status)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <div className="flex items-center space-x-2">
                  <span>Provider: <strong className="text-slate-300">{ti.provider || 'Threat Intel Feed'}</strong></span>
                  {ti.reputation_score !== undefined && ti.reputation_score !== null && (
                    <span>&bull; Rep Score: <strong className="text-white">{ti.reputation_score}</strong></span>
                  )}
                </div>
                {ti.details && Object.keys(ti.details).length > 0 && (
                  <span className="text-[10px] text-indigo-400 font-semibold">
                    {Object.keys(ti.details).length} telemetry field(s)
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg p-6 text-center text-xs font-mono text-slate-400 space-y-1">
            <Globe className="w-5 h-5 text-slate-500 mx-auto" />
            <p>No matching intelligence was returned by the configured threat intelligence providers.</p>
            <p className="text-[10px] text-slate-500">Unregistered or zero-day artifacts may not yet appear in global TI feeds.</p>
          </div>
        )}
      </div>

      {/* Semantic Guidance */}
      <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          <strong>Intelligence Feeds:</strong> Telemetry reflects external reputation lookups. An absence of TI matches does not imply safety for freshly staged infrastructure.
        </p>
      </div>
    </div>
  );
};
