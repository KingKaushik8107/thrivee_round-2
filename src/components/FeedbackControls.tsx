import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, MessageSquare, Check } from 'lucide-react';
import { submitAnalystFeedback } from '../services/api';

interface FeedbackControlsProps {
  incidentId: string;
}

export const FeedbackControls: React.FC<FeedbackControlsProps> = ({ incidentId }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (feedbackType: 'confirmed_phishing' | 'false_positive' | 'needs_review') => {
    setSubmitting(true);
    try {
      await submitAnalystFeedback(incidentId, feedbackType, 'SOC Analyst', '');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      console.error('Feedback submission error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2 text-slate-200">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            HUMAN SOC ANALYST VALIDATION & FEEDBACK
          </h3>
        </div>
        {submitted && (
          <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
            <Check className="w-3.5 h-3.5" />
            <span>Audit Log Updated</span>
          </span>
        )}
      </div>

      <div className="text-xs text-slate-400 mb-3">
        Your verdict will be recorded in the security audit database to refine future ML retraining sets.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => handleSubmit('confirmed_phishing')}
          disabled={submitting}
          className="flex items-center justify-center space-x-2 p-2.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 text-xs font-bold font-mono transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4 text-red-400" />
          <span>CONFIRMED PHISHING</span>
        </button>

        <button
          onClick={() => handleSubmit('false_positive')}
          disabled={submitting}
          className="flex items-center justify-center space-x-2 p-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 text-xs font-bold font-mono transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4 text-emerald-400" />
          <span>FALSE POSITIVE</span>
        </button>

        <button
          onClick={() => handleSubmit('needs_review')}
          disabled={submitting}
          className="flex items-center justify-center space-x-2 p-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 text-xs font-bold font-mono transition-colors disabled:opacity-50"
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>NEEDS ESCALATION</span>
        </button>
      </div>
    </div>
  );
};
