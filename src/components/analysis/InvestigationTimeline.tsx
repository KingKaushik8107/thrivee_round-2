import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Cpu,
  Activity,
  Globe,
  Tag,
  FileText,
  UserCheck,
  Clock,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import type { TimelineEvent } from '../../types';
import { getIncidentTimeline } from '../../services/api';

interface InvestigationTimelineProps {
  incidentId: string;
  initialTimeline?: TimelineEvent[];
  refreshTrigger?: number;
}

const EVENT_ICON_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }> = {
  created: {
    icon: ShieldCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-950/80',
    border: 'border-blue-700/60',
  },
  ml_inference: {
    icon: Cpu,
    color: 'text-purple-400',
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/60',
  },
  forensic_rules: {
    icon: Activity,
    color: 'text-amber-400',
    bg: 'bg-amber-950/80',
    border: 'border-amber-700/60',
  },
  threat_intel: {
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-700/60',
  },
  status_change: {
    icon: Tag,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/80',
    border: 'border-yellow-700/60',
  },
  analyst_note: {
    icon: FileText,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/80',
    border: 'border-indigo-700/60',
  },
  feedback: {
    icon: UserCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-700/60',
  },
};

export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({
  incidentId,
  initialTimeline = [],
  refreshTrigger = 0,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>(initialTimeline);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if ((initialTimeline.length === 0 || refreshTrigger > 0) && incidentId) {
      setIsLoading(true);
      getIncidentTimeline(incidentId)
        .then((res) => {
          if (isMounted) setEvents(res);
        })
        .catch((e) => {
          console.error('Failed to load timeline:', e);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [incidentId, initialTimeline.length, refreshTrigger]);

  const handleRefresh = async () => {
    if (!incidentId) return;
    setIsLoading(true);
    try {
      const res = await getIncidentTimeline(incidentId);
      setEvents(res);
    } catch (e) {
      console.error('Failed to refresh timeline:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            INVESTIGATION TIMELINE & AUDIT TRAIL
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
            {events.length}
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
          title="Refresh timeline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 space-y-4 max-h-96 overflow-y-auto pr-2 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {isLoading && events.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-slate-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading timeline events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-slate-500">
            No timeline events recorded yet.
          </div>
        ) : (
          events.map((evt, idx) => {
            const config = EVENT_ICON_CONFIG[evt.event_type] || EVENT_ICON_CONFIG.created;
            const IconComponent = config.icon;

            return (
              <div key={evt.id || idx} className="relative group">
                {/* Node icon */}
                <div className={`absolute -left-6 top-0.5 p-1 rounded-full border ${config.bg} ${config.border} ${config.color} shadow-sm`}>
                  <IconComponent className="w-3 h-3" />
                </div>

                {/* Event Card */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      <span>{evt.title}</span>
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
                        {evt.actor}
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>

                  {evt.description && (
                    <p className="text-xs font-mono text-slate-400 pl-4 border-l border-slate-800/60 leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
