import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import type { FeatureContribution } from '../../types';

interface XAIContributionChartProps {
  phishingFeatures: FeatureContribution[];
  legitimateFeatures: FeatureContribution[];
}

export const XAIContributionChart: React.FC<XAIContributionChartProps> = ({
  phishingFeatures = [],
  legitimateFeatures = []
}) => {
  const [activeTab, setActiveTab] = useState<'phishing' | 'legitimate' | 'both'>('both');
  const [showAllPhish, setShowAllPhish] = useState(false);
  const [showAllLegit, setShowAllLegit] = useState(false);

  // Determine maximum absolute contribution for proportional bar scaling
  const allContribs = [
    ...phishingFeatures.map(f => Math.abs(f.contribution)),
    ...legitimateFeatures.map(f => Math.abs(f.contribution))
  ];
  const maxAbsContrib = allContribs.length > 0 ? Math.max(...allContribs, 0.01) : 1.0;

  const displayedPhish = showAllPhish ? phishingFeatures : phishingFeatures.slice(0, 5);
  const displayedLegit = showAllLegit ? legitimateFeatures : legitimateFeatures.slice(0, 5);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-slate-200">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            LOCAL FEATURE ATTRIBUTION (XAI)
          </h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
              activeTab === 'both' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL FEATURES
          </button>
          <button
            onClick={() => setActiveTab('phishing')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 transition-colors ${
              activeTab === 'phishing' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>PHISHING ({phishingFeatures.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('legitimate')}
            className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 transition-colors ${
              activeTab === 'legitimate' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>LEGITIMATE ({legitimateFeatures.length})</span>
          </button>
        </div>
      </div>

      {/* Feature Attribution Grid */}
      <div className={`grid gap-4 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Phishing-Direction Features */}
        {(activeTab === 'both' || activeTab === 'phishing') && (
          <div className="bg-slate-950/80 border border-rose-950/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-rose-950/80">
                <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs font-bold uppercase">
                  <TrendingUp className="w-4 h-4" />
                  <span>PHISHING-DIRECTION FEATURES (+)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {phishingFeatures.length} driver(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
                Linguistic tokens that pushed the classifier logit score toward phishing:
              </p>
            </div>

            {/* Feature Item List */}
            <div className="space-y-2.5">
              {displayedPhish.length > 0 ? (
                displayedPhish.map((f, idx) => {
                  const widthPct = Math.min(100, Math.max(8, (Math.abs(f.contribution) / maxAbsContrib) * 100));
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 text-xs font-mono space-y-1.5 hover:border-rose-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-rose-400 font-bold">[+]</span>
                          <span className="text-white font-bold tracking-wide">
                            "{f.feature}"
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 text-[10px]">
                            w: {f.weight > 0 ? `+${f.weight.toFixed(2)}` : f.weight.toFixed(2)} | tfidf: {f.tfidf.toFixed(3)}
                          </span>
                          <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-900 text-[11px]">
                            +{f.contribution.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Contribution Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-rose-500 to-red-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs italic py-4 text-center">
                  No positive phishing-direction features identified.
                </div>
              )}
            </div>

            {/* Expand / Collapse Button */}
            {phishingFeatures.length > 5 && (
              <button
                onClick={() => setShowAllPhish(!showAllPhish)}
                className="text-[11px] font-mono font-bold text-rose-400 hover:text-rose-300 pt-1 flex items-center justify-center space-x-1 w-full transition-colors"
              >
                <span>{showAllPhish ? 'SHOW LESS' : `SHOW ALL (${phishingFeatures.length}) PHISHING FEATURES`}</span>
                {showAllPhish ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {/* Legitimate-Direction Features */}
        {(activeTab === 'both' || activeTab === 'legitimate') && (
          <div className="bg-slate-950/80 border border-emerald-950/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-950/80">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                  <TrendingDown className="w-4 h-4" />
                  <span>LEGITIMATE-DIRECTION FEATURES (-)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {legitimateFeatures.length} driver(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
                Linguistic tokens that pushed the classifier logit score toward legitimate:
              </p>
            </div>

            {/* Feature Item List */}
            <div className="space-y-2.5">
              {displayedLegit.length > 0 ? (
                displayedLegit.map((f, idx) => {
                  const widthPct = Math.min(100, Math.max(8, (Math.abs(f.contribution) / maxAbsContrib) * 100));
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 text-xs font-mono space-y-1.5 hover:border-emerald-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-400 font-bold">[-]</span>
                          <span className="text-white font-bold tracking-wide">
                            "{f.feature}"
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 text-[10px]">
                            w: {f.weight.toFixed(2)} | tfidf: {f.tfidf.toFixed(3)}
                          </span>
                          <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-900 text-[11px]">
                            {f.contribution.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Contribution Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs italic py-4 text-center">
                  No legitimate-direction features identified.
                </div>
              )}
            </div>

            {/* Expand / Collapse Button */}
            {legitimateFeatures.length > 5 && (
              <button
                onClick={() => setShowAllLegit(!showAllLegit)}
                className="text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 pt-1 flex items-center justify-center space-x-1 w-full transition-colors"
              >
                <span>{showAllLegit ? 'SHOW LESS' : `SHOW ALL (${legitimateFeatures.length}) LEGITIMATE FEATURES`}</span>
                {showAllLegit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Semantic Guidance Note */}
      <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          <strong>Analytical Interpretation:</strong> Positive values <code className="text-rose-400">(+)</code> increase the linear model logit toward phishing. Negative values <code className="text-emerald-400">(-)</code> decrease the logit toward legitimate. Legitimate tokens do not cancel out deterministic protocol anomalies (e.g. brand lookalike domains).
        </p>
      </div>
    </div>
  );
};
