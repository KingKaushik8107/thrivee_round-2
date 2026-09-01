import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Skull,
  Flame,
  Activity,
  ArrowRight,
  TrendingUp,
  PieChart as PieChartIcon,
  Crosshair,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { DashboardStats } from '../types';
import { getDashboardStats } from '../services/api';

interface DashboardPageProps {
  onInvestigateIncident: (incidentId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onInvestigateIncident,
  onNavigateToTab
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading SOC Telemetry & Defense Analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Chart Data Preparation
  const verdictPieData = [
    { name: 'Critical Phishing', value: stats.verdict_distribution.critical_phishing || 0, color: '#ef4444' },
    { name: 'Phishing', value: stats.verdict_distribution.phishing || 0, color: '#f97316' },
    { name: 'Suspicious', value: stats.verdict_distribution.suspicious || 0, color: '#eab308' },
    { name: 'Legitimate', value: stats.verdict_distribution.legitimate || 0, color: '#10b981' }
  ].filter(d => d.value > 0);

  const attackBarData = Object.entries(stats.attack_type_distribution || {}).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: count
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-400 font-mono text-xs font-bold border border-red-800/80">
              ACTIVE DEFENSE
            </span>
            <span className="text-xs text-slate-400 font-mono">SOC LEVEL 3 INVESTIGATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 font-sans">
            Phishing Attack Investigation Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Real-time multi-stage security telemetry, brand lookalike detection, ML language probability, and campaign correlation.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={() => onNavigateToTab('investigate')}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-2"
          >
            <span>NEW INVESTIGATION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyzed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 font-mono">Total Analyzed</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono mt-2">
            {stats.total_analyzed}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <span className="text-indigo-400 font-bold font-mono">{stats.phishing_percentage}%</span>
            <span>phishing threat ratio</span>
          </div>
        </div>

        {/* Critical Threats */}
        <div className="bg-slate-900 border border-red-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-red-400 font-mono">Critical Phishing</span>
            <Skull className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-extrabold text-red-400 font-mono mt-2">
            {stats.critical_count}
          </div>
          <div className="text-[11px] text-red-400/80 mt-1">
            Requires immediate mailbox quarantine
          </div>
        </div>

        {/* High Severity Threats */}
        <div className="bg-slate-900 border border-orange-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-orange-400 font-mono">High Risk Phishing</span>
            <ShieldAlert className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-extrabold text-orange-400 font-mono mt-2">
            {stats.high_count}
          </div>
          <div className="text-[11px] text-orange-400/80 mt-1">
            Credential solicitation & lookalikes
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-slate-900 border border-purple-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-purple-400 font-mono">Active Campaigns</span>
            <Flame className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-purple-400 font-mono mt-2">
            {stats.campaign_count}
          </div>
          <div className="text-[11px] text-purple-400/80 mt-1">
            Correlated multi-victim clusters
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verdict Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-200">
              <PieChartIcon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wide">
                VERDICT BREAKDOWN
              </h3>
            </div>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verdictPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {verdictPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
            {verdictPieData.map((d, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-400 truncate">{d.name}:</span>
                <strong className="text-white">{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Attack Types Distribution Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-200">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wide">
                ATTACK VECTOR DISTRIBUTION
              </h3>
            </div>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackBarData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Impersonated Brands */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-200">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wide">
                TOP IMPERSONATED BRANDS
              </h3>
            </div>
          </div>

          <div className="space-y-3 my-2 flex-1 flex flex-col justify-center">
            {stats.top_brands && stats.top_brands.length > 0 ? (
              stats.top_brands.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-5 text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="font-bold text-white truncate">{b.brand}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/80 font-bold shrink-0">
                    {b.count} incidents
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No targeted brands recorded yet.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono pt-3 border-t border-slate-800 text-center">
            Derived from RapidFuzz character substitution heuristics
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2 text-slate-200">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono tracking-wide">
              RECENT INVESTIGATION QUEUE
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('history')}
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View Complete Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="p-3">Verdict</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Sender Address</th>
                <th className="p-3">Subject Line</th>
                <th className="p-3">Target Brand</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
              {stats.recent_incidents && stats.recent_incidents.length > 0 ? (
                stats.recent_incidents.map((inc) => {
                  const isCrit = inc.verdict === 'critical_phishing';
                  const isPhish = inc.verdict === 'phishing';
                  const isSusp = inc.verdict === 'suspicious';

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => onInvestigateIncident(inc.id)}
                      className="hover:bg-slate-900/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isCrit
                              ? 'bg-red-950 text-red-400 border-red-800'
                              : isPhish
                              ? 'bg-orange-950 text-orange-400 border-orange-800'
                              : isSusp
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {inc.verdict.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">
                        {Math.round(inc.risk_score)} / 100
                      </td>
                      <td className="p-3 text-slate-300 truncate max-w-[200px]">
                        {inc.sender || 'Unknown'}
                      </td>
                      <td className="p-3 font-sans text-white font-semibold truncate max-w-[240px]">
                        {inc.subject || '(No Subject)'}
                      </td>
                      <td className="p-3">
                        {inc.target_brand ? (
                          <span className="text-amber-300 font-bold">{inc.target_brand}</span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center space-x-1">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No recent incidents. Analyze an email to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
