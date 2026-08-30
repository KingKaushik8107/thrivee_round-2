import React, { useRef } from 'react';
import type { NetworkNode as INetworkNode, Packet, SimulationConfig, SimulationStatus } from '../types/network';
import { getEdgeSvgPath, NETWORK_EDGES } from '../simulation/networkGraph';
import { NetworkNode } from './NetworkNode';
import { PacketParticle } from './PacketParticle';
import { Play, Pause, RefreshCw, Cpu, Activity } from 'lucide-react';

interface JourneyVisualizationProps {
  nodes: INetworkNode[];
  packets: Packet[];
  config: SimulationConfig;
  status: SimulationStatus;
  onToggleNode: (nodeId: string) => void;
  onSelectNode: (node: INetworkNode) => void;
  onSelectPacket: (packet: Packet) => void;
  onTogglePause: () => void;
  onReset: () => void;
  selectedPacket: Packet | null;
  selectedNode: INetworkNode | null;
  reducedMotion: boolean;
}

export const JourneyVisualization: React.FC<JourneyVisualizationProps> = ({
  nodes,
  packets,
  config,
  status,
  onToggleNode,
  onSelectNode,
  onSelectPacket,
  onTogglePause,
  onReset,
  selectedPacket,
  selectedNode,
  reducedMotion,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const isRunning = status === 'transmitting' || status === 'packetizing' || status === 'paused';

  return (
    <section
      id="journey-canvas-section"
      aria-label="Interactive Network Visualization Arena"
      className="w-full max-w-6xl mx-auto px-2 sm:px-4 mb-8"
    >
      <div className="relative rounded-3xl bg-[#070b16] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Arena Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
          {/* Stage Breadcrumb / Stage Columns */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5 mr-2">
              <Activity className="w-3.5 h-3.5" /> STAGES:
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              1. DEVICE
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
              2. ROUTER
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              3. GLOBAL INTERNET
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
              4. DATA CENTER
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              5. DESTINATION
            </span>
          </div>

          {/* Canvas Playback Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {isRunning && (
              <button
                onClick={onTogglePause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-95 cursor-pointer"
                aria-label={status === 'paused' ? 'Resume journey' : 'Pause journey'}
              >
                {status === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>RESUME</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>PAUSE</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-95 cursor-pointer"
              title="Reset simulation (R)"
              aria-label="Reset simulation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* Packetizing Overlay Animation */}
        {status === 'packetizing' && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-fade-in pointer-events-none">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/50 shadow-[0_0_30px_rgba(0,240,255,0.3)] max-w-md w-full">
              <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-sm font-bold mb-3">
                <Cpu className="w-5 h-5 animate-spin" />
                <span>SEGMENTING &amp; ENCAPSULATING PAYLOAD</span>
              </div>
              <div className="text-xs text-slate-300 font-mono mb-4">
                Splitting &quot;{config.message}&quot; into {config.packetCount} TCP/IP packets with checksums...
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: config.packetCount }).map((_, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-slate-950 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    PKT #{i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SVG Interactive Canvas */}
        <div className="relative w-full aspect-[2/1] min-h-[380px] sm:min-h-[480px] max-h-[640px] bg-cyber-grid bg-radial-vignette overflow-hidden">
          <svg
            ref={svgRef}
            viewBox="0 0 1200 600"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Node glow filters */}
              <filter id="glow-cyan-filter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-red-filter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Edge Gradient Line */}
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Background Stage Zone Dividers */}
            <g opacity="0.15">
              <line x1="145" y1="40" x2="145" y2="560" stroke="#38bdf8" strokeDasharray="4 6" strokeWidth="1" />
              <line x1="280" y1="40" x2="280" y2="560" stroke="#38bdf8" strokeDasharray="4 6" strokeWidth="1" />
              <line x1="900" y1="40" x2="900" y2="560" stroke="#38bdf8" strokeDasharray="4 6" strokeWidth="1" />
              <line x1="1040" y1="40" x2="1040" y2="560" stroke="#38bdf8" strokeDasharray="4 6" strokeWidth="1" />
            </g>

            {/* Stage Column Background Labels */}
            <g opacity="0.12" className="pointer-events-none select-none font-mono font-extrabold uppercase">
              <text x="80" y="70" textAnchor="middle" fill="#00f0ff" fontSize="16">YOUR DEVICE</text>
              <text x="210" y="70" textAnchor="middle" fill="#38bdf8" fontSize="16">ROUTER</text>
              <text x="590" y="70" textAnchor="middle" fill="#818cf8" fontSize="20">INTERNET CORE MESH</text>
              <text x="970" y="70" textAnchor="middle" fill="#34d399" fontSize="16">DATA CENTER</text>
              <text x="1110" y="70" textAnchor="middle" fill="#10b981" fontSize="16">DESTINATION</text>
            </g>

            {/* Render Network Edges (Pathways) */}
            <g className="edges-layer">
              {NETWORK_EDGES.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;

                const isEdgeDisabled = from.status === 'disabled' || to.status === 'disabled';
                const pathD = getEdgeSvgPath(from, to, edge.curveOffset ?? 0);

                return (
                  <g key={edge.id}>
                    {/* Base Track */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isEdgeDisabled ? '#4c0519' : '#1e293b'}
                      strokeWidth={isEdgeDisabled ? 1.5 : 2}
                      strokeDasharray={isEdgeDisabled ? '4 4' : 'none'}
                      opacity={isEdgeDisabled ? 0.4 : 0.8}
                    />

                    {/* Active Optical Pulse Line */}
                    {!isEdgeDisabled && !reducedMotion && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#edge-gradient)"
                        strokeWidth={1.5}
                        strokeDasharray="8 32"
                        className="animate-dash-flow"
                        opacity={0.7}
                      />
                    )}

                    {/* Edge Cable Type Small Label */}
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 + (edge.curveOffset ?? 0) - 6}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize="8"
                      fontFamily="monospace"
                      className="pointer-events-none select-none opacity-60"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Render Network Nodes */}
            <g className="nodes-layer">
              {nodes.map((node) => (
                <NetworkNode
                  key={node.id}
                  node={node}
                  onToggleNode={onToggleNode}
                  onSelectNode={onSelectNode}
                  isSelected={selectedNode?.id === node.id}
                />
              ))}
            </g>

            {/* Render Packets in Motion */}
            <g className="packets-layer">
              {packets.map((packet) => (
                <PacketParticle
                  key={packet.id}
                  packet={packet}
                  onSelectPacket={onSelectPacket}
                  isSelected={selectedPacket?.id === packet.id}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Arena Bottom Guidance Strip */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
              <span>Normal Packet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
              <span>Rerouted Route</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
              <span>Retransmission</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
              <span>Packet Loss</span>
            </div>
          </div>

          <div className="text-slate-500">
            Click any packet to inspect headers • Click nodes to toggle failure
          </div>
        </div>
      </div>
    </section>
  );
};
