import React from 'react';
import { Radio, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Left branding */}
        <div className="space-y-2">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xl font-extrabold font-mono tracking-wider text-white">
              PACKET
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
              v1.0
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            An interactive simulation of the invisible journey behind every message.
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Educational simulation — network behavior, latency, and routing are simulated.
          </p>
        </div>

        {/* Right action & scroll-to-top */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-95 cursor-pointer"
            aria-label="Scroll back to top"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <div className="text-xs text-slate-600 font-mono">
            Built with React • Tailwind CSS • SVG • Web Audio
          </div>
        </div>
      </div>
    </footer>
  );
};
