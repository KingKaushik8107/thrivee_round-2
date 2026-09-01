import React, { useState } from 'react';
import { ListChecks, CheckCircle2, Circle } from 'lucide-react';
import type { ActionRecommendation, Severity } from '../types';

interface ActionPlaybookProps {
  recommendations: ActionRecommendation[];
}

export const ActionPlaybook: React.FC<ActionPlaybookProps> = ({ recommendations }) => {
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  if (!recommendations || recommendations.length === 0) return null;

  const toggleAction = (idx: number) => {
    setCompletedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getPriorityBadge = (p: Severity) => {
    switch (p) {
      case 'critical':
        return 'bg-red-950/70 border-red-800 text-red-400';
      case 'high':
        return 'bg-orange-950/70 border-orange-800 text-orange-400';
      case 'medium':
        return 'bg-amber-950/70 border-amber-800 text-amber-400';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2 text-slate-200">
          <ListChecks className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            RECOMMENDED SOC RESPONSE PLAYBOOK
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          {Object.values(completedActions).filter(Boolean).length} / {recommendations.length} Executed
        </div>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec, idx) => {
          const isDone = Boolean(completedActions[idx]);

          return (
            <div
              key={idx}
              onClick={() => toggleAction(idx)}
              className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer select-none flex items-start space-x-3 ${
                isDone
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-500" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${getPriorityBadge(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <h4 className={`text-xs sm:text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                    {rec.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {rec.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
