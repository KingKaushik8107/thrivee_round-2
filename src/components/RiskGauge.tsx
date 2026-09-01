import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Skull, Cpu, Crosshair } from 'lucide-react';
import type { Verdict } from '../types';

interface RiskGaugeProps {
  score: number;
  verdict: Verdict;
  mlProbability: number;
  targetBrand?: string | null;
  brandSimilarity?: number | null;
  attackType?: string;
  attackConfidence?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  verdict,
  mlProbability,
  targetBrand,
  brandSimilarity,
  attackType,
  attackConfidence = 0.85
}) => {
  // Determine verdict visual styling
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let gaugeColor = '#10b981';
  let VerdictIcon = ShieldCheck;
  let verdictLabel = 'LEGITIMATE / BENIGN';

  if (verdict === 'critical_phishing') {
    badgeColor = 'bg-red-500/15 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10';
    gaugeColor = '#ef4444';
    VerdictIcon = Skull;
    verdictLabel = 'CRITICAL PHISHING';
  } else if (verdict === 'phishing') {
    badgeColor = 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    gaugeColor = '#f97316';
    VerdictIcon = ShieldAlert;
    verdictLabel = 'HIGH RISK PHISHING';
  } else if (verdict === 'suspicious') {
    badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    gaugeColor = '#eab308';
    VerdictIcon = AlertTriangle;
    verdictLabel = 'SUSPICIOUS EMAIL';
  }

  // SVG Gauge calculations (semi-circle)
  const radius = 70;
  const strokeWidth = 14;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Background glow according to risk */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ backgroundColor: gaugeColor }}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Interactive Semi-Circle Gauge */}
        <div className="flex flex-col items-center justify-center relative">
          <svg width="180" height="110" className="overflow-visible">
            {/* Background Arc */}
            <path
              d="M 20 100 A 70 70 0 0 1 160 100"
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d="M 20 100 A 70 70 0 0 1 160 100"
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute bottom-1 flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {Math.round(score)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Risk Score / 100
            </span>
          </div>
        </div>

        {/* Center: Verdict & Target Brand */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-bold text-xs sm:text-sm uppercase tracking-wider ${badgeColor}`}>
              <VerdictIcon className="w-4 h-4" />
              <span>{verdictLabel}</span>
            </div>

            {targetBrand && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                <Crosshair className="w-3.5 h-3.5" />
                <span>Target: {targetBrand}</span>
                {brandSimilarity && (
                  <span className="text-rose-400/80 font-mono">({Math.round(brandSimilarity * 100)}%)</span>
                )}
              </span>
            )}
          </div>

          {/* Attack Objective */}
          {attackType && (
            <div className="text-xs text-slate-300 flex items-center justify-center md:justify-start space-x-2">
              <span className="text-slate-400">Classified Attack Vector:</span>
              <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {attackType.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                ({Math.round(attackConfidence * 100)}% conf)
              </span>
            </div>
          )}
        </div>

        {/* Right: ML Model Comparison Badge */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 min-w-[200px] flex flex-col justify-center space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>ML Classifier</span>
            </span>
            <span className="font-mono font-bold text-white">
              {Math.round(mlProbability * 100)}% Phishing
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                mlProbability > 0.7 ? 'bg-red-500' : mlProbability > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${mlProbability * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
            <span>Fusion Weight</span>
            <span className="text-slate-300">30% ML / 70% Rules</span>
          </div>
        </div>
      </div>
    </div>
  );
};
