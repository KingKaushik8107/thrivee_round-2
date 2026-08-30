import React from 'react';
import { Activity, Clock, Zap, Layers, RefreshCw, Radio, ShieldCheck } from 'lucide-react';
import type { SimulationStats as ISimulationStats, SimulationStatus } from '../types/network';

interface SimulationStatsProps {
  stats: ISimulationStats;
  status: SimulationStatus;
  protocol: 'TCP' | 'UDP';
  totalPackets: number;
}

export const SimulationStats: React.FC<SimulationStatsProps> = ({
  stats,
  status,
  protocol,
  totalPackets,
}) => {
  return (
    <section
      id="telemetry-stats-section"
      aria-label="Real-time Network Telemetry"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8"
    >
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl">
        {/* Title and simulated badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              LIVE NETWORK TELEMETRY HUD
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 italic">
            * All telemetry metrics are educational simulated values
          </span>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Active Packets */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>PACKETS</span>
            </div>
            <div className="text-lg font-bold font-mono text-cyan-300">
              {stats.packetsDelivered}/{totalPackets || stats.packetsCreated || 4}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {status === 'delivered' ? '100% arrived' : `${totalPackets - stats.packetsDelivered} in transit`}
            </div>
          </div>

          {/* Nodes Crossed */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>HOPS CROSSED</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-300">
              {stats.nodesCrossed}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Router hops
            </div>
          </div>

          {/* Simulated Latency */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>AVG LATENCY</span>
            </div>
            <div className="text-lg font-bold font-mono text-sky-300">
              {stats.avgLatencyMs} ms
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Round-trip time (RTT)
            </div>
          </div>

          {/* Packet Loss */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>PACKET LOSS</span>
            </div>
            <div className="text-lg font-bold font-mono text-rose-300">
              {stats.packetsDropped} dropped
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Link noise / drop
            </div>
          </div>

          {/* TCP Retransmissions */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>RETRANSMITS</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-300">
              {stats.retransmissions}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {protocol === 'TCP' ? 'TCP Recovery active' : 'UDP (No recovery)'}
            </div>
          </div>

          {/* Current Stage */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>ACTIVE STAGE</span>
            </div>
            <div className="text-sm font-bold font-mono text-purple-300 uppercase truncate">
              {stats.currentStage}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {protocol} Protocol
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
