import React, { useState } from 'react';
import { Database, Copy, Check, Download, ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';
import type { IOCCollection, IOCItem } from '../types';
import { getIncidentIOCs } from '../services/api';

interface IOCExportPanelProps {
  incidentId: string;
  iocs: IOCCollection;
}

export const IOCExportPanel: React.FC<IOCExportPanelProps> = ({ incidentId, iocs }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'domains' | 'urls' | 'emails' | 'ips' | 'hashes'>('all');
  const [copied, setCopied] = useState(false);

  if (!iocs) return null;

  const categories = [
    { id: 'all', label: 'All IOCs' },
    { id: 'domains', label: `Domains (${iocs.domains?.length || 0})` },
    { id: 'urls', label: `URLs (${iocs.urls?.length || 0})` },
    { id: 'emails', label: `Emails (${iocs.emails?.length || 0})` },
    { id: 'ips', label: `IPs (${iocs.ips?.length || 0})` },
    { id: 'hashes', label: `Hashes (${iocs.hashes?.length || 0})` },
  ];

  const getFilteredItems = (): IOCItem[] => {
    if (activeTab === 'all') {
      return [
        ...(iocs.domains || []),
        ...(iocs.urls || []),
        ...(iocs.emails || []),
        ...(iocs.ips || []),
        ...(iocs.hashes || [])
      ];
    }
    return (iocs as any)[activeTab] || [];
  };

  const filteredItems = getFilteredItems();

  const handleCopyAll = () => {
    const textList = filteredItems.map(item => `${item.type.toUpperCase()}: ${item.value}`).join('\n');
    navigator.clipboard.writeText(textList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = async () => {
    try {
      const blob = await getIncidentIOCs(incidentId, 'csv');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `iocs_${incidentId.slice(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e) {
      console.error('Error downloading CSV:', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'malicious':
        return {
          icon: ShieldAlert,
          className: 'bg-red-950/80 text-red-400 border-red-800/80',
          label: 'Malicious'
        };
      case 'suspicious':
        return {
          icon: AlertTriangle,
          className: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
          label: 'Suspicious'
        };
      case 'clean':
        return {
          icon: ShieldCheck,
          className: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
          label: 'Clean'
        };
      default:
        return {
          icon: HelpCircle,
          className: 'bg-slate-800 text-slate-400 border-slate-700',
          label: 'Unknown / Not Checked'
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2 text-slate-200">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            INDICATORS OF COMPROMISE (IOCs)
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY IOCs'}</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 my-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              activeTab === cat.id
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* IOC Items List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            No indicators of compromise found in this category.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const statusConfig = getStatusBadge(item.threat_intel_status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono hover:border-slate-700 transition-colors space-x-2"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase shrink-0">
                    {item.type}
                  </span>
                  <span className="text-slate-200 truncate select-all">{item.value}</span>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusConfig.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
