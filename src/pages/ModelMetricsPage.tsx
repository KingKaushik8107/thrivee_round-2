import React, { useEffect, useState } from 'react';
import { Cpu, Database, RefreshCw } from 'lucide-react';
import type { ModelMetrics } from '../types';
import { getModelMetrics } from '../services/api';

export const ModelMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getModelMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Error loading model metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading ML Model Telemetry & Evaluation Metrics...</p>
      </div>
    );
  }

  if (!metrics) return null;

  const m = metrics.metrics;
  const cm = metrics.confusion_matrix;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 font-mono text-xs font-bold border border-indigo-800/80">
              ML BENCHMARK & EVALUATION
            </span>
            <span className="text-xs text-slate-400 font-mono">SCIKIT-LEARN MODEL HEALTH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 font-sans">
            Machine Learning Pipeline Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Real evaluation metrics on unseen test splits from the primary Hugging Face dataset <code className="text-indigo-300">{metrics.dataset_name}</code>.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-colors flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>RELOAD METRICS</span>
        </button>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase text-slate-400 font-mono">Accuracy</span>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {Math.round(m.accuracy * 1000) / 10}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Overall classification</div>
        </div>

        <div className="bg-slate-900 border border-indigo-900/40 rounded-xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase text-indigo-400 font-mono">Precision</span>
          <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">
            {Math.round(m.precision * 1000) / 10}%
          </div>
          <div className="text-[10px] text-indigo-400/80 font-mono mt-1">False positive control</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase text-emerald-400 font-mono">Recall</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {Math.round(m.recall * 1000) / 10}%
          </div>
          <div className="text-[10px] text-emerald-400/80 font-mono mt-1">Phishing catch rate</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase text-amber-400 font-mono">F1-Score</span>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {Math.round(m.f1_score * 1000) / 10}%
          </div>
          <div className="text-[10px] text-amber-400/80 font-mono mt-1">Harmonic mean</div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 rounded-xl p-4 shadow-lg">
          <span className="text-xs font-bold uppercase text-purple-400 font-mono">ROC-AUC</span>
          <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">
            {m.roc_auc.toFixed(4)}
          </div>
          <div className="text-[10px] text-purple-400/80 font-mono mt-1">Discrimination power</div>
        </div>
      </div>

      {/* Confusion Matrix & Model Architecture Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>TEST CONFUSION MATRIX ({metrics.total_test_samples} SAMPLES)</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-center pt-2">
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 flex flex-col justify-center">
              <span className="text-xs text-slate-400 uppercase">True Negatives (TN)</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1">{cm.true_negatives}</span>
              <span className="text-[11px] text-emerald-500/80 mt-1">Legitimate correctly identified</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-red-900/60 flex flex-col justify-center">
              <span className="text-xs text-slate-400 uppercase">False Positives (FP)</span>
              <span className="text-3xl font-extrabold text-red-400 mt-1">{cm.false_positives}</span>
              <span className="text-[11px] text-red-500/80 mt-1">Legitimate flagged as phishing</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-amber-900/60 flex flex-col justify-center">
              <span className="text-xs text-slate-400 uppercase">False Negatives (FN)</span>
              <span className="text-3xl font-extrabold text-amber-400 mt-1">{cm.false_negatives}</span>
              <span className="text-[11px] text-amber-500/80 mt-1">Phishing missed</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 flex flex-col justify-center">
              <span className="text-xs text-slate-400 uppercase">True Positives (TP)</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1">{cm.true_positives}</span>
              <span className="text-[11px] text-emerald-500/80 mt-1">Phishing correctly detected</span>
            </div>
          </div>
        </div>

        {/* Model Architecture & Training Spec */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>PIPELINE ARCHITECTURE SPECIFICATION</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase">Model Class:</span>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{metrics.model_architecture}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase">Feature Engineering:</span>
              <div className="text-slate-200 font-bold mt-0.5">TF-IDF Word + Character N-grams (1, 2), Sublinear TF</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase">Hyperparameters:</span>
              <div className="text-slate-200 font-bold mt-0.5">Solver: L-BFGS, Class Weight: Balanced, C: 2.0</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase">Artifact Serialization:</span>
              <div className="text-slate-200 font-bold mt-0.5">Joblib serialized models & vectorizers in /models/</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Features / Important N-grams Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Phishing Indicators */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
            Top Phishing Predictive Feature Tokens (+ Coefficients)
          </h3>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {metrics.top_phishing_features?.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-slate-950 text-xs font-mono border border-red-950/80"
              >
                <span className="text-red-300 font-bold">{f.feature}</span>
                <span className="text-slate-400 font-bold">+{f.weight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Benign Indicators */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            Top Benign Predictive Feature Tokens (- Coefficients)
          </h3>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {metrics.top_benign_features?.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-slate-950 text-xs font-mono border border-emerald-950/80"
              >
                <span className="text-emerald-300 font-bold">{f.feature}</span>
                <span className="text-slate-400 font-bold">{f.weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
