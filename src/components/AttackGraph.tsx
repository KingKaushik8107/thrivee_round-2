import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface AttackGraphProps {
  incident: IncidentAnalysis;
}

export const AttackGraph: React.FC<AttackGraphProps> = ({ incident }) => {
  if (!incident) return null;

  // Build DAG Nodes for the email's kill chain
  const senderDomain = incident.email?.sender?.split('@')[1] || 'attacker-host';
  const targetBrand = incident.target_brand || 'Target Org';
  const topUrl = incident.email?.urls?.[0] || 'http://login-verify-portal';
  const attackType = (incident.attack_type || 'Credential Harvesting').replace(/_/g, ' ').toUpperCase();

  const nodes: Node[] = [
    {
      id: 'node-sender',
      type: 'default',
      position: { x: 50, y: 120 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">1. Ingress Sender</div>
            <div className="text-xs font-bold text-red-400 truncate max-w-[140px]">{incident.email?.sender || 'Unknown'}</div>
          </div>
        )
      },
      style: {
        background: '#0f172a',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
      }
    },
    {
      id: 'node-brand',
      type: 'default',
      position: { x: 250, y: 40 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">2. Brand Impersonation</div>
            <div className="text-xs font-bold text-amber-300">{targetBrand}</div>
          </div>
        )
      },
      style: {
        background: '#0f172a',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
      }
    },
    {
      id: 'node-domain',
      type: 'default',
      position: { x: 250, y: 200 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">3. Lookalike Domain</div>
            <div className="text-xs font-bold text-orange-400 truncate max-w-[140px]">{senderDomain}</div>
          </div>
        )
      },
      style: {
        background: '#0f172a',
        border: '1px solid #f97316',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
      }
    },
    {
      id: 'node-url',
      type: 'default',
      position: { x: 470, y: 120 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">4. Phishing Payload / Link</div>
            <div className="text-xs font-bold text-rose-400 truncate max-w-[140px]">{topUrl}</div>
          </div>
        )
      },
      style: {
        background: '#0f172a',
        border: '1px solid #f43f5e',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)'
      }
    },
    {
      id: 'node-objective',
      type: 'default',
      position: { x: 690, y: 120 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">5. Attack Objective</div>
            <div className="text-xs font-extrabold text-red-500">{attackType}</div>
          </div>
        )
      },
      style: {
        background: '#1e1b4b',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
      }
    }
  ];

  const edges: Edge[] = [
    { id: 'e1-2', source: 'node-sender', target: 'node-brand', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
    { id: 'e1-3', source: 'node-sender', target: 'node-domain', animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
    { id: 'e2-4', source: 'node-brand', target: 'node-url', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } },
    { id: 'e3-4', source: 'node-domain', target: 'node-url', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } },
    { id: 'e4-5', source: 'node-url', target: 'node-objective', animated: true, style: { stroke: '#ef4444', strokeWidth: 3 } }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2 text-slate-200">
          <GitBranch className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            ATTACK KILL CHAIN GRAPH (REACT FLOW)
          </h3>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Interactive Node Topology
        </div>
      </div>

      <div className="h-72 w-full rounded-lg border border-slate-950 overflow-hidden bg-slate-950/90">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
          <Controls className="bg-slate-900 border-slate-700 text-white rounded shadow" />
        </ReactFlow>
      </div>
    </div>
  );
};
