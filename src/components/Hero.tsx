import React from 'react';
import { ArrowDown, Radio, Cpu, Network, ShieldCheck, Sparkles } from 'lucide-react';

interface HeroProps {
  onStartClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartClick }) => {
  return (
    <header className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-12 pb-20">
      {/* Ambient Animated Network Particle Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-600/10 via-blue-600/5 to-transparent rounded-full blur-3xl opacity-75" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl opacity-50" />

        {/* SVG Mesh Grid Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="0.75" />
              <circle cx="0" cy="0" r="1.5" fill="rgba(0, 240, 255, 0.4)" />
            </pattern>
            <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
              <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
          
          {/* Animated decorative data beams */}
          <line x1="10%" y1="20%" x2="40%" y2="60%" stroke="url(#beamGrad)" strokeWidth="1.5" strokeDasharray="100 200" className="animate-dash-flow" />
          <line x1="85%" y1="15%" x2="55%" y2="75%" stroke="url(#beamGrad)" strokeWidth="1.5" strokeDasharray="120 180" className="animate-dash-flow" />
          <line x1="20%" y1="80%" x2="70%" y2="40%" stroke="url(#beamGrad)" strokeWidth="1.5" strokeDasharray="80 220" className="animate-dash-flow" />
        </svg>
      </div>

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider uppercase mb-8 shadow-[0_0_20px_rgba(0,240,255,0.15)] animate-fade-in backdrop-blur-md">
        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>PACKET — Visualizing the Invisible</span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span className="text-slate-400">Simulation Engine</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.08] mb-6">
        <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-sm">
          YOU PRESSED
        </span>
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 font-mono tracking-tight drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]">
          SEND.
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-slate-300 max-w-3xl mx-auto mb-6 tracking-tight">
        But where did your message actually go?
      </p>

      {/* Short Description */}
      <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
        Follow a message as it becomes packets, crosses a simulated network, survives disruptions, and reaches its destination.
      </p>

      {/* CTA Button & Secondary indicator */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onStartClick}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm sm:text-base tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] focus:outline-none focus:ring-4 focus:ring-cyan-400/50 active:scale-[0.98] cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-slate-950" />
          <span>EXPERIENCE THE JOURNEY</span>
          <ArrowDown className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-y-1" />
        </button>

        <span className="text-xs font-mono text-slate-400 tracking-wide">
          Interactive educational simulation
        </span>
      </div>

      {/* Subtle feature pillars */}
      <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl w-full text-left">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="text-cyan-400 font-mono text-xs mb-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> MTU CHUNKING
          </div>
          <div className="text-xs text-slate-400">Message to binary packet split</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="text-cyan-400 font-mono text-xs mb-1 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5" /> DYNAMIC ROUTING
          </div>
          <div className="text-xs text-slate-400">Dijkstra multi-path failover</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="text-cyan-400 font-mono text-xs mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> CHAOS LAB
          </div>
          <div className="text-xs text-slate-400">Latency, Loss & Node Outages</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
          <div className="text-cyan-400 font-mono text-xs mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> REASSEMBLY
          </div>
          <div className="text-xs text-slate-400">TCP sequence & Checksum verify</div>
        </div>
      </div>
    </header>
  );
};
