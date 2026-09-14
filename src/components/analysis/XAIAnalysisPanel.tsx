import React from 'react';
import {
  Sparkles,
  BrainCircuit,
  Info,
  CheckCircle2
} from 'lucide-react';

import type { IncidentAnalysis } from '../../types';
import { XAIModelDecisionCard } from './XAIModelDecisionCard';
import { XAIContributionChart } from './XAIContributionChart';
import { ForensicEvidencePanel } from './ForensicEvidencePanel';
import { ThreatIntelEvidencePanel } from './ThreatIntelEvidencePanel';

interface XAIAnalysisPanelProps {
  analysis: IncidentAnalysis;
}

export const XAIAnalysisPanel: React.FC<XAIAnalysisPanelProps> = ({ analysis }) => {
  if (!analysis) return null;

  const { xai, risk_score, ml_probability } = analysis;


  // Fallback state if XAI was not populated by older API responses
  if (!xai) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-amber-400 font-mono text-sm font-bold">
          <Info className="w-5 h-5" />
          <span>EXPLAINABLE AI (XAI) EVIDENCE UNAVAILABLE</span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Local feature attribution was not returned for this incident record. The standard forensic rule analysis and 0–100 risk scoring remain fully accessible below.
        </p>
      </div>
    );
  }

  const {
    model_features,
    forensic_evidence = [],
    threat_intelligence_evidence = [],
    summary = '',
    confidence_notes = []
  } = xai;

  return (

    <div className="space-y-6">
      {/* 1. Primary XAI Narrative & Investigation Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-700/60 text-indigo-300 shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                <span>SOC EXPLAINABLE AI (XAI) INVESTIGATION SUITE</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ground-truth feature attributions, deterministic forensic checks, and threat telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400">Composite Risk:</span>
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              {Math.round(risk_score)} / 100
            </span>
          </div>
        </div>

        {/* Why did THRIVE classify this email this way? */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs font-bold uppercase">
            <Sparkles className="w-4 h-4" />
            <span>WHY DID THRIVE CLASSIFY THIS EMAIL THIS WAY?</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
            {summary || analysis.summary || analysis.explanation}
          </p>
        </div>

        {/* Multi-Layer Confidence Notes */}
        {confidence_notes && confidence_notes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {confidence_notes.map((note, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-start space-x-2 text-xs font-mono text-slate-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Top Grid: ML Model Decision Card & Feature Attribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <XAIModelDecisionCard
          modelFeatures={model_features}
          mlProbability={ml_probability}
        />


        <XAIContributionChart
          phishingFeatures={model_features?.top_phishing_features || []}
          legitimateFeatures={model_features?.top_legitimate_features || []}
        />
      </div>

      {/* 3. Bottom Grid: Segregated Forensic & Threat Intelligence Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ForensicEvidencePanel
          evidenceList={forensic_evidence.length > 0 ? forensic_evidence : analysis.indicators}
        />

        <ThreatIntelEvidencePanel
          threatIntelList={threat_intelligence_evidence}
        />
      </div>
    </div>
  );
};
