import React, { useState } from 'react';
import { Send, Sparkles, Shield, Layers, RefreshCw } from 'lucide-react';
import type { SimulationConfig, SimulationStatus } from '../types/network';

interface MessageInputProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  onSend: () => void;
  onReset: () => void;
  status: SimulationStatus;
}

const PRESET_MESSAGES = [
  { text: 'Hello from Coimbatore 👋', tag: 'Default' },
  { text: 'Meeting at 5pm? 🚀', tag: 'Short' },
  { text: 'TCP Handshake complete ✨', tag: 'Tech' },
  { text: 'Streaming 4K video segment 🎬', tag: 'Media' },
  { text: 'Quick ping 127.0.0.1 📡', tag: 'Network' },
];

export const MessageInput: React.FC<MessageInputProps> = ({
  config,
  onChangeConfig,
  onSend,
  onReset,
  status,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isRunning = status === 'transmitting' || status === 'packetizing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRunning) {
      onSend();
    }
  };

  return (
    <section 
      id="message-input-section" 
      aria-label="Message Transmission Controls"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-8"
    >
      <div className={`relative p-6 sm:p-8 rounded-3xl transition-all duration-300 ${
        isFocused 
          ? 'glass-panel-glow shadow-[0_0_40px_rgba(0,240,255,0.2)]' 
          : 'glass-panel'
      }`}>
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isRunning ? 'bg-cyan-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isRunning ? 'bg-cyan-500' : 'bg-emerald-500'
              }`} />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>Compose Internet Payload</span>
              <span className="text-xs font-mono font-normal text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                Layer 7 (Application)
              </span>
            </h2>
          </div>

          {/* Quick status badge */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span>Status:</span>
            <span className={`font-semibold uppercase tracking-wider ${
              isRunning ? 'text-cyan-400 animate-pulse' : status === 'delivered' ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {status === 'idle' ? 'Ready to Transmit' : status}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={config.message}
                onChange={(e) => onChangeConfig({ message: e.target.value })}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type a message..."
                disabled={isRunning}
                maxLength={60}
                className="w-full h-14 px-5 pr-12 rounded-2xl bg-slate-950/80 border border-slate-700/70 text-slate-100 text-base sm:text-lg placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                aria-label="Message to transmit across the network"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500 pointer-events-none">
                {config.message.length}/60
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isRunning || !config.message.trim()}
                className="h-14 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold tracking-wider uppercase text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-400/40"
              >
                <Send className={`w-4 h-4 text-slate-950 ${isRunning ? 'animate-bounce' : ''}`} />
                <span>{isRunning ? 'TRANSMITTING...' : 'SEND'}</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                title="Reset simulation to initial state (Shortcut: R)"
                className="h-14 px-4 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-95 cursor-pointer"
                aria-label="Reset simulation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preset Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-mono text-slate-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Presets:
            </span>
            {PRESET_MESSAGES.map((preset) => (
              <button
                key={preset.text}
                type="button"
                onClick={() => {
                  if (!isRunning) {
                    onChangeConfig({ message: preset.text });
                  }
                }}
                disabled={isRunning}
                className={`px-3 py-1 rounded-full text-xs font-mono tracking-tight transition-all border ${
                  config.message === preset.text
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {preset.text}
              </button>
            ))}
          </div>

          {/* Advanced Transmission Configurations */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Packet Count Chunking */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-slate-300">Packet Segmentation:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[4, 6, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChangeConfig({ packetCount: count })}
                    disabled={isRunning}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      config.packetCount === count
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    } disabled:opacity-50`}
                  >
                    {count} pkts
                  </button>
                ))}
              </div>
            </div>

            {/* Protocol Selector (TCP vs UDP) */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-slate-300">Transport Protocol:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ protocol: 'TCP' })}
                  disabled={isRunning}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    config.protocol === 'TCP'
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  } disabled:opacity-50`}
                  title="TCP guarantees delivery with automated retransmissions for dropped packets"
                >
                  TCP (Reliable)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ protocol: 'UDP' })}
                  disabled={isRunning}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    config.protocol === 'UDP'
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  } disabled:opacity-50`}
                  title="UDP is best-effort: dropped packets are permanently lost"
                >
                  UDP (Fast)
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};
