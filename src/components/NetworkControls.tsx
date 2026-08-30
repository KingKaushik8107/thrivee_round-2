import React from 'react';
import { ShieldAlert, Gauge, AlertTriangle, Sparkles, RefreshCw, Activity, Zap } from 'lucide-react';
import type { SimulationConfig } from '../types/network';

interface NetworkControlsProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  onDisableRandomNode: () => void;
  disabledNodeIds: string[];
  onResetNodes: () => void;
}

export const NetworkControls: React.FC<NetworkControlsProps> = ({
  config,
  onChangeConfig,
  onDisableRandomNode,
  disabledNodeIds,
  onResetNodes,
}) => {
  const applyScenario = (name: string) => {
    switch (name) {
      case 'ideal':
        onChangeConfig({ speedMultiplier: 1.5, baseLatencyMs: 25, congestionLevel: 0, packetLossRate: 0 });
        break;
      case 'subsea_cut':
        onChangeConfig({ speedMultiplier: 1.0, baseLatencyMs: 65, congestionLevel: 45, packetLossRate: 15 });
        onDisableRandomNode();
        break;
      case 'peak_traffic':
        onChangeConfig({ speedMultiplier: 0.75, baseLatencyMs: 120, congestionLevel: 80, packetLossRate: 10 });
        break;
      case 'satellite':
        onChangeConfig({ speedMultiplier: 0.5, baseLatencyMs: 380, congestionLevel: 25, packetLossRate: 5 });
        break;
      case 'faulty_wifi':
        onChangeConfig({ speedMultiplier: 1.0, baseLatencyMs: 40, congestionLevel: 10, packetLossRate: 35 });
        break;
    }
  };

  return (
    <section
      id="network-lab-section"
      aria-label="Network Lab Chaos Controls"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8"
    >
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
                <span>NETWORK LAB: BREAK THE NETWORK</span>
              </h2>
              <p className="text-xs text-slate-400">
                Inject real-time physical latency, congestion bottlenecks, packet drop rates, and link failures
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDisableRandomNode}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-mono font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
              title="Knock out a transit node to trigger dynamic BGP rerouting (Shortcut: N)"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>DISABLE RANDOM NODE</span>
            </button>

            {disabledNodeIds.length > 0 && (
              <button
                onClick={onResetNodes}
                className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-xs transition-all active:scale-95 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                title="Restore all disabled nodes"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RESTORE ALL ({disabledNodeIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Latency Control */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
                <Gauge className="w-4 h-4" />
                <span>1. LATENCY &amp; SPEED</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {config.speedMultiplier}x ({config.baseLatencyMs}ms)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Slow motion lets you observe header inspection and packet queuing in granular detail.
            </p>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.25"
              value={config.speedMultiplier}
              onChange={(e) => {
                const spd = parseFloat(e.target.value);
                const lat = Math.round(150 / spd);
                onChangeConfig({ speedMultiplier: spd, baseLatencyMs: lat });
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              aria-label="Simulation speed multiplier and latency"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0.25x (Slow-Mo)</span>
              <span>1.0x (Normal)</span>
              <span>2.5x (Fast)</span>
            </div>
          </div>

          {/* Congestion Control */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                <Activity className="w-4 h-4" />
                <span>2. ROUTE CONGESTION</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {config.congestionLevel}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Injects simulated buffer bloat, causing queues and forcing packets along alternate fiber paths.
            </p>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={config.congestionLevel}
              onChange={(e) => onChangeConfig({ congestionLevel: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              aria-label="Simulated network route congestion level"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Empty)</span>
              <span>50% (Busy)</span>
              <span>100% (Saturated)</span>
            </div>
          </div>

          {/* Packet Loss Control */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>3. PACKET LOSS</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {config.packetLossRate}% Drop
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates noisy links. TCP triggers retransmissions; UDP drops chunks permanently.
            </p>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={config.packetLossRate}
              onChange={(e) => onChangeConfig({ packetLossRate: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              aria-label="Simulated packet loss probability rate"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Lossless)</span>
              <span>25% (Degraded)</span>
              <span>50% (Hostile)</span>
            </div>
          </div>
        </div>

        {/* Disruption Presets Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-500 mr-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Real-World Scenarios:
          </span>
          <button
            onClick={() => applyScenario('ideal')}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer"
          >
            ✨ Pristine Terrestrial Fiber
          </button>
          <button
            onClick={() => applyScenario('subsea_cut')}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer"
          >
            🌊 Subsea Cable Severed
          </button>
          <button
            onClick={() => applyScenario('peak_traffic')}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            🚦 Black Friday Peak Congestion
          </button>
          <button
            onClick={() => applyScenario('satellite')}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-purple-300 hover:border-purple-500/40 transition-colors cursor-pointer"
          >
            🛰️ Deep Orbit Satellite Link
          </button>
          <button
            onClick={() => applyScenario('faulty_wifi')}
            className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer"
          >
            📶 Noisy Weak Wi-Fi Signal
          </button>
        </div>
      </div>
    </section>
  );
};
