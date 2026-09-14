import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Calculator
} from 'lucide-react';
import type { XAIModelFeatures } from '../../types';

interface XAIModelDecisionCardProps {
  modelFeatures?: XAIModelFeatures;
  mlProbability?: number;
}

export const XAIModelDecisionCard: React.FC<XAIModelDecisionCardProps> = ({
  modelFeatures,
  mlProbability = 0.5
}) => {

  const [showMathDetails, setShowMathDetails] = useState(false);

  if (!modelFeatures) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-xs text-slate-400 font-mono">
        ML feature attribution data is not available for this record.
      </div>
    );
  }

  const {
    decision_score = 0,
    intercept = 0,
    total_feature_contribution = 0,
    is_mathematically_valid = true,
    active_feature_count = 0
  } = modelFeatures;

  const isPhishingPred = (mlProbability ?? 0) >= 0.5 || decision_score > 0;
  const predLabel = isPhishingPred ? 'PHISHING' : 'LEGITIMATE';
  const predColor = isPhishingPred ? 'text-rose-400 bg-rose-950/60 border-rose-800/80' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80';

  const probPercent = Math.round((mlProbability ?? 0) * 10000) / 100;
  const reconstructed = Math.round((intercept + total_feature_contribution) * 10000) / 10000;
  const mathDiff = Math.abs(reconstructed - decision_score);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-slate-200">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            ML CLASSIFIER & DECISION LOGIT
          </h3>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border uppercase ${predColor}`}>
          Prediction: {predLabel}
        </div>
      </div>

      {/* Primary Quantitative Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* ML Phishing Probability */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Phishing Probability</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {probPercent}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Sigmoid output σ(Score)
          </div>
        </div>

        {/* Linear Decision Score */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Decision Score</div>
          <div className={`text-xl font-bold font-mono mt-1 ${decision_score > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {decision_score > 0 ? `+${decision_score.toFixed(4)}` : decision_score.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Model logit score (ℝ)
          </div>
        </div>

        {/* Base Intercept */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Base Intercept (β₀)</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            {intercept > 0 ? `+${intercept.toFixed(4)}` : intercept.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Prior corpus bias
          </div>
        </div>

        {/* Total Feature Contribution */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Total Features (Σ cᵢ)</div>
          <div className={`text-xl font-bold font-mono mt-1 ${total_feature_contribution > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {total_feature_contribution > 0 ? `+${total_feature_contribution.toFixed(4)}` : total_feature_contribution.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {active_feature_count} active token(s)
          </div>
        </div>
      </div>

      {/* Mathematical Validation Status Bar */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          {is_mathematically_valid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-slate-300 font-mono">
            {is_mathematically_valid ? (
              <>
                <strong className="text-emerald-400 font-bold">MATHEMATICAL VERIFICATION:</strong> Intercept + Sum(Contributions) matches logit decision score (diff &lt; 0.0001).
              </>
            ) : (
              <>
                <strong className="text-amber-400 font-bold">RECONSTRUCTION NOTICE:</strong> Discrepancy observed between linear logit and feature sum.
              </>
            )}
          </span>
        </div>

        <button
          onClick={() => setShowMathDetails(!showMathDetails)}
          className="text-[11px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 shrink-0 transition-colors"
        >
          <span>{showMathDetails ? 'HIDE FORMULA' : 'HOW XAI WORKS'}</span>
          {showMathDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Technical Math Section */}
      {showMathDetails && (
        <div className="bg-slate-950 border border-indigo-900/50 rounded-xl p-4 text-xs font-mono space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-indigo-300 font-bold border-b border-indigo-900/60 pb-2">
            <Calculator className="w-4 h-4" />
            <span>EXACT LINEAR LOGISTIC ATTRIBUTION FORMULATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">1. Local Feature Contribution</div>
              <p className="text-slate-400 text-[11px]">
                Each vocabulary token <code className="text-slate-200">i</code> produces an exact linear logit delta:
              </p>
              <div className="bg-slate-950 p-2 rounded mt-2 text-amber-300 font-bold">
                Contribution_i = Weight_i × TF-IDF_i
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">2. Decision Score & Probability</div>
              <p className="text-slate-400 text-[11px]">
                The complete decision score is the linear sum converted via logistic sigmoid:
              </p>
              <div className="bg-slate-950 p-2 rounded mt-2 text-emerald-300 font-bold">
                Score = Intercept + Σ Contribution_i
              </div>
            </div>
          </div>

          {/* Proof verification table */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Arithmetic Verification Proof:</div>
            <div className="flex justify-between py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Base Intercept (β₀):</span>
              <span className="text-white font-bold">{intercept > 0 ? `+${intercept.toFixed(4)}` : intercept.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Net Feature Contributions (Σ wᵢ·xᵢ):</span>
              <span className="text-white font-bold">{total_feature_contribution > 0 ? `+${total_feature_contribution.toFixed(4)}` : total_feature_contribution.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800 text-indigo-300 font-bold">
              <span>Reconstructed Decision Score:</span>
              <span>{reconstructed > 0 ? `+${reconstructed.toFixed(4)}` : reconstructed.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-emerald-400 font-bold">
              <span>Classifier Model Decision Score:</span>
              <span>{decision_score > 0 ? `+${decision_score.toFixed(4)}` : decision_score.toFixed(4)} (diff = {mathDiff.toFixed(6)})</span>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-900/30">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>SOC Analyst Semantics:</strong> A feature contribution is a linear attribution to the model's logit score, NOT a percentage probability increase or a composite risk score deduction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
