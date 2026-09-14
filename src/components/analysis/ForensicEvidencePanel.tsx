import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileSearch,
  CheckCircle2
} from 'lucide-react';

import type { XAIForensicEvidence, Indicator } from '../../types';



interface ForensicEvidencePanelProps {
  evidenceList?: (XAIForensicEvidence | Indicator)[];
}

export const ForensicEvidencePanel: React.FC<ForensicEvidencePanelProps> = ({
  evidenceList = []
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getSeverityBadge = (sev: string) => {
    const s = sev?.toLowerCase();
    if (s === 'critical') {
      return (
        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3" />
          <span>CRITICAL</span>
        </span>
      );
    }
    if (s === 'high') {
      return (
        <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>HIGH</span>
        </span>
      );
    }
    if (s === 'medium') {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold font-mono flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>MEDIUM</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-bold font-mono flex items-center space-x-1">
        <Info className="w-3 h-3" />
        <span>LOW</span>
      </span>
    );
  };

  const filteredList = filterSeverity === 'all'
    ? evidenceList
    : evidenceList.filter(e => e.severity?.toLowerCase() === filterSeverity);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-slate-200">
          <FileSearch className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            DETERMINISTIC FORENSIC EVIDENCE
          </h3>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {['all', 'critical', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-colors ${
                filterSeverity === s
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Evidence Items */}
      <div className="space-y-2.5">
        {filteredList.length > 0 ? (
          filteredList.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs font-mono space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2">
                    {getSeverityBadge(item.severity)}
                    <div>
                      <div className="text-white font-bold text-xs">{item.title}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Source: {item.source?.replace(/_/g, ' ')} &bull; Category: {item.category?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Evidence snippet */}
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 text-[11px] font-mono break-all">
                  <span className="text-slate-500 mr-1.5">Evidence:</span>
                  <span className="text-red-300 font-semibold">{item.evidence}</span>
                </div>

                {/* Expanded Context Description */}
                {isExpanded && item.description && (
                  <div className="pt-2 border-t border-slate-800/80 text-slate-400 text-[11px] leading-relaxed font-sans">
                    <strong className="text-slate-300 font-mono text-[10px] uppercase block mb-0.5">Security Rationale:</strong>
                    {item.description}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg p-6 text-center text-xs font-mono text-slate-400 space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <p>No adverse forensic security indicators triggered for this criteria.</p>
          </div>
        )}
      </div>

      {/* Architectural Separation Note */}
      <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <p>
          <strong>Forensic Layer:</strong> Evaluated via deterministic heuristic and protocol rules (domain Punycode, typosquatting distance, sender-reply-to mismatch, deceptive link anchors). Separate from ML token frequency modeling.
        </p>
      </div>
    </div>
  );
};
