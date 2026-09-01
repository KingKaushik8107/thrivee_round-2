import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Users,
  Globe,
  Link,
  Target,
  RefreshCw,
  ArrowRight,
  GitMerge
} from 'lucide-react';
import type { CampaignSummary, CampaignDetail } from '../types';
import { getCampaigns, getCampaignDetail } from '../services/api';

interface CampaignsPageProps {
  initialCampaignId?: string | null;
  onInvestigateIncident: (incidentId: string) => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({
  initialCampaignId,
  onInvestigateIncident
}) => {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaignsList = async () => {
      setLoading(true);
      try {
        const res = await getCampaigns();
        setCampaigns(res.campaigns || []);
        
        const targetId = initialCampaignId || (res.campaigns?.[0]?.id);
        if (targetId) {
          const detail = await getCampaignDetail(targetId);
          setSelectedCampaign(detail);
        }
      } catch (e) {
        console.error('Error loading campaigns:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaignsList();
  }, [initialCampaignId]);

  const handleSelectCampaign = async (campId: string) => {
    try {
      const detail = await getCampaignDetail(campId);
      setSelectedCampaign(detail);
    } catch (e) {
      console.error('Error fetching campaign detail:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Correlating Multi-Incident Phishing Campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-400 font-mono text-xs font-bold border border-purple-800/80">
              CORRELATION ENGINE
            </span>
            <span className="text-xs text-slate-400 font-mono">MULTI-TENANT THREAT CLUSTERING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 font-sans">
            Coordinated Phishing Campaign Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Detects distributed threat infrastructure, shared lookalike domains, and cross-recipient targeting patterns using TF-IDF cosine similarity and Levenshtein token clustering.
          </p>
        </div>
      </div>

      {/* Main Layout: Campaign Selector Column + Details / React Flow View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaigns List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Active Campaign Clusters ({campaigns.length})
          </h3>

          <div className="space-y-2.5">
            {campaigns.map((camp) => {
              const isSelected = selectedCampaign?.id === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => handleSelectCampaign(camp.id)}
                  className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-purple-400 border border-purple-900/60">
                      {camp.id}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {camp.email_count} emails
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                    {camp.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                    <div>
                      Target: <strong className="text-amber-300">{camp.target_brand || 'Generic'}</strong>
                    </div>
                    <div>
                      Recipients: <strong className="text-white">{camp.recipient_count}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2-Columns: Selected Campaign Details & Graph */}
        {selectedCampaign && (
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {selectedCampaign.id}
                    </span>
                    <h2 className="text-base font-bold text-white">
                      {selectedCampaign.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    First Detected: {new Date(selectedCampaign.first_seen).toLocaleDateString()} &bull; Last Activity: {new Date(selectedCampaign.last_seen).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* 4 Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>RECIPIENTS</span>
                  </div>
                  <div className="text-base font-bold text-white mt-1">{selectedCampaign.recipient_count} targets</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-orange-400" />
                    <span>DOMAINS</span>
                  </div>
                  <div className="text-base font-bold text-orange-300 mt-1">{selectedCampaign.domain_count} lookalikes</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                    <Link className="w-3 h-3 text-rose-400" />
                    <span>PAYLOAD URLs</span>
                  </div>
                  <div className="text-base font-bold text-rose-300 mt-1">{selectedCampaign.url_count} endpoints</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                    <Target className="w-3 h-3 text-amber-400" />
                    <span>TARGET BRAND</span>
                  </div>
                  <div className="text-base font-bold text-amber-300 mt-1">{selectedCampaign.target_brand || 'Generic'}</div>
                </div>
              </div>

              {/* Shared Domains & URLs Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Shared Lookalike Domains:</span>
                  <div className="space-y-1 mt-1">
                    {selectedCampaign.shared_domains?.map((d, i) => (
                      <div key={i} className="p-1.5 rounded bg-slate-950 text-orange-300 border border-slate-800 truncate">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Shared Phishing URLs:</span>
                  <div className="space-y-1 mt-1">
                    {selectedCampaign.shared_urls?.map((u, i) => (
                      <div key={i} className="p-1.5 rounded bg-slate-950 text-rose-300 border border-slate-800 truncate">
                        {u}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* React Flow Campaign Cluster Graph */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-slate-200">
                  <GitMerge className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold font-mono tracking-wide">
                    CAMPAIGN TOPOLOGY GRAPH (REACT FLOW)
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Multi-Node Relationship View</span>
              </div>

              <div className="h-80 w-full rounded-lg border border-slate-950 overflow-hidden bg-slate-950/90">
                <ReactFlow
                  nodes={selectedCampaign.graph?.nodes || []}
                  edges={selectedCampaign.graph?.edges || []}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
                  <Controls className="bg-slate-900 border-slate-700 text-white rounded" />
                </ReactFlow>
              </div>
            </div>

            {/* Correlated Email Members Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h3 className="text-sm font-bold font-mono text-white">
                  MEMBER INCIDENTS IN THIS CAMPAIGN ({selectedCampaign.members?.length || 0})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Incident ID</th>
                      <th className="p-2.5">Sender Address</th>
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5">Similarity</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                    {selectedCampaign.members?.map((m) => (
                      <tr key={m.email_id} className="hover:bg-slate-900/80 transition-colors">
                        <td className="p-2.5 text-purple-400 font-bold">{m.email_id.slice(0, 8)}</td>
                        <td className="p-2.5 text-slate-300 truncate max-w-[160px]">{m.sender || 'Unknown'}</td>
                        <td className="p-2.5 font-sans text-white truncate max-w-[200px]">{m.subject || '(No Subject)'}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                            {Math.round(m.similarity_score * 100)}% match
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => onInvestigateIncident(m.email_id)}
                            className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center space-x-1"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
