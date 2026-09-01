import React, { useEffect, useState } from 'react';
import { Search, Filter, ArrowRight, RefreshCw } from 'lucide-react';
import { getIncidents } from '../services/api';
import type { Verdict } from '../types';

interface IncidentHistoryPageProps {
  onSelectIncident: (incidentId: string) => void;
}

export const IncidentHistoryPage: React.FC<IncidentHistoryPageProps> = ({ onSelectIncident }) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getIncidents({
        search: search.trim() || undefined,
        verdict: verdictFilter || undefined,
        limit: 100
      });
      setIncidents(res.incidents || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('Error loading incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [verdictFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'critical_phishing':
        return 'bg-red-950/80 text-red-400 border-red-800/80';
      case 'phishing':
        return 'bg-orange-950/80 text-orange-400 border-orange-800/80';
      case 'suspicious':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      default:
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 font-mono text-xs font-bold border border-cyan-800/80">
              AUDIT QUEUE
            </span>
            <span className="text-xs text-slate-400 font-mono">DATABASE INCIDENT HISTORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 font-sans">
            Incident Investigation Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Search and filter past email forensics, risk verdicts, and analyst validation audit trails.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sender address or subject..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Verdicts</option>
            <option value="critical_phishing">Critical Phishing</option>
            <option value="phishing">High Phishing</option>
            <option value="suspicious">Suspicious</option>
            <option value="legitimate">Legitimate / Benign</option>
          </select>

          <button
            onClick={fetchList}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Total Recorded Incidents: <strong className="text-white">{total}</strong></span>
          <span className="text-slate-500">Sorted by newest first</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="p-3">Incident ID</th>
                <th className="p-3">Verdict</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Sender Address</th>
                <th className="p-3">Subject Line</th>
                <th className="p-3">Target Brand</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    No matching incidents found in database.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-indigo-400 font-bold">{inc.id.slice(0, 8)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getVerdictBadge(inc.verdict)}`}>
                        {inc.verdict.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">
                      {Math.round(inc.risk_score)} / 100
                    </td>
                    <td className="p-3 text-slate-300 truncate max-w-[180px]">
                      {inc.sender || 'Unknown'}
                    </td>
                    <td className="p-3 font-sans text-white font-semibold truncate max-w-[220px]">
                      {inc.subject || '(No Subject)'}
                    </td>
                    <td className="p-3 text-amber-300 font-bold">
                      {inc.target_brand || <span className="text-slate-600 font-normal">None</span>}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(inc.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(inc.id);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center space-x-1"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
