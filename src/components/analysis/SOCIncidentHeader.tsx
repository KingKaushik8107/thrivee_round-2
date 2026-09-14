import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  Clock,
  Tag,
  Flame,
  Activity,
  UserCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { IncidentAnalysis, IncidentStatus, Verdict } from '../../types';
import { updateIncidentStatus } from '../../services/api';

interface SOCIncidentHeaderProps {
  analysis: IncidentAnalysis;
  onStatusUpdated?: (newStatus: IncidentStatus) => void;
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; bg: string; text: string; border: string }> = {
  new: {
    label: 'NEW',
    bg: 'bg-blue-950/60',
    text: 'text-blue-400',
    border: 'border-blue-700/60',
  },
  investigating: {
    label: 'INVESTIGATING',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-700/60',
  },
  confirmed_threat: {
    label: 'CONFIRMED THREAT',
    bg: 'bg-red-950/60',
    text: 'text-red-400',
    border: 'border-red-700/60',
  },
  false_positive: {
    label: 'FALSE POSITIVE',
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-600/60',
  },
  resolved: {
    label: 'RESOLVED',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-700/60',
  },
};

const VERDICT_CONFIG: Record<Verdict, { label: string; bg: string; text: string; border: string }> = {
  critical_phishing: {
    label: 'CRITICAL PHISHING',
    bg: 'bg-red-950/80',
    text: 'text-red-400',
    border: 'border-red-700',
  },
  phishing: {
    label: 'PHISHING',
    bg: 'bg-rose-950/80',
    text: 'text-rose-400',
    border: 'border-rose-700',
  },
  suspicious: {
    label: 'SUSPICIOUS',
    bg: 'bg-amber-950/80',
    text: 'text-amber-400',
    border: 'border-amber-700',
  },
  legitimate: {
    label: 'LEGITIMATE',
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-400',
    border: 'border-emerald-700',
  },
};

export const SOCIncidentHeader: React.FC<SOCIncidentHeaderProps> = ({
  analysis,
  onStatusUpdated,
}) => {
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(analysis.status || 'new');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const incidentId = analysis.incident_id || analysis.id || 'INC-UNKNOWN';
  const displayId = incidentId.length > 12 ? `INC-${incidentId.slice(0, 8).toUpperCase()}` : incidentId;

  const handleCopyId = () => {
    navigator.clipboard.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as IncidentStatus;
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    setStatusMessage(null);

    try {
      await updateIncidentStatus(incidentId, newStatus, 'SOC Analyst');
      setCurrentStatus(newStatus);
      setStatusMessage(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      if (onStatusUpdated) {
        onStatusUpdated(newStatus);
      }
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusMessage('Error updating status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusStyle = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;
  const verdictStyle = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.suspicious;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Top row: ID, Status dropdown, Verdict, Timestamp */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-slate-800 text-red-400 border border-slate-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                  SOC INCIDENT CASE
                </span>
                <button
                  onClick={handleCopyId}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 transition-colors"
                  title="Copy full incident ID"
                >
                  <span className="font-bold text-white">{displayId}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight mt-0.5">
                {analysis.email?.subject || 'Email Threat Investigation'}
              </h1>
            </div>
          </div>
        </div>

        {/* Right Action: Status dropdown & Quick metrics */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-xs font-mono text-slate-400 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>STATUS:</span>
            </span>
            <div className="relative">
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border appearance-none cursor-pointer focus:outline-none transition-colors pr-6 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                <option value="new">NEW</option>
                <option value="investigating">INVESTIGATING</option>
                <option value="confirmed_threat">CONFIRMED THREAT</option>
                <option value="false_positive">FALSE POSITIVE</option>
                <option value="resolved">RESOLVED</option>
              </select>
              {isUpdating && (
                <RefreshCw className="w-3 h-3 animate-spin absolute right-2 top-2 text-slate-400 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Verdict Badge */}
          <div className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center space-x-1.5 ${verdictStyle.bg} ${verdictStyle.text} ${verdictStyle.border}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
            <span>{verdictStyle.label}</span>
          </div>
        </div>
      </div>

      {/* Status Feedback banner */}
      {statusMessage && (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Meta Pills Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Ingested: <strong className="text-slate-200">{new Date(analysis.created_at).toLocaleString()}</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-red-400" />
          <span>Risk Score: <strong className="text-white">{analysis.risk_score.toFixed(1)}/100</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>ML Probability: <strong className="text-white">{(analysis.ml_probability * 100).toFixed(1)}%</strong></span>
        </div>

        {analysis.target_brand && (
          <div className="flex items-center space-x-1.5 bg-purple-950/50 px-3 py-1.5 rounded-lg border border-purple-800 text-purple-300">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>Target Brand: <strong className="text-white">{analysis.target_brand}</strong></span>
          </div>
        )}

        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Tag className="w-3.5 h-3.5 text-slate-500" />
          <span>Attack Type: <strong className="text-slate-200">{analysis.attack_type.replace(/_/g, ' ').toUpperCase()}</strong></span>
        </div>
      </div>
    </div>
  );
};
