import React, { useEffect, useState } from 'react';
import { CheckCircle, ShieldCheck, Layers, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Packet } from '../types/network';

interface ReconstructionMomentProps {
  reassemblyBuffer: (Packet | null)[];
  originalMessage: string;
  onReplay: () => void;
  reducedMotion: boolean;
}

export const ReconstructionMoment: React.FC<ReconstructionMomentProps> = ({
  reassemblyBuffer,
  originalMessage,
  onReplay,
  reducedMotion,
}) => {
  const [revealedChars, setRevealedChars] = useState(0);

  useEffect(() => {
    if (!reducedMotion) {
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#3b82f6', '#10b981', '#a855f7'],
        });
      } catch {
        // Confetti gracefully handled
      }
    }
  }, [reducedMotion]);

  useEffect(() => {
    setRevealedChars(0);
    const total = originalMessage.length;
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setRevealedChars(current);
      if (current >= total) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [originalMessage]);

  const reconstructedText = originalMessage.slice(0, revealedChars);

  return (
    <section
      id="reconstruction-section"
      aria-label="Packet Reassembly and Delivery Climax"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-12 animate-fade-in"
    >
      <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0a1626] to-[#060c18] border-2 border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.25)] text-center overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Delivered Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 font-mono font-bold text-sm tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>DELIVERED</span>
        </div>

        {/* Reassembly Buffer Sequence Visualization */}
        <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Layers className="w-4 h-4" /> TCP Socket Reassembly Buffer:
            </span>
            <span className="text-emerald-400">All Checksums Verified (0x0000)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {reassemblyBuffer.map((pkt, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-left transition-all font-mono ${
                  pkt
                    ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-950 border-rose-500/40 text-rose-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>SLOT #{idx + 1}</span>
                  {pkt ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <span>MISSING</span>}
                </div>
                <div className="text-sm font-bold text-white truncate font-sans">
                  {pkt ? `"${pkt.payload}"` : '[DROPPED]'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {pkt ? `CRC: ${pkt.checksum}` : 'UDP Loss'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reconstructed Human Message */}
        <div className="mb-8">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
            Reconstructed Application Data:
          </div>
          <div className="inline-block px-8 py-5 rounded-2xl bg-slate-950 border border-cyan-500/40 text-2xl sm:text-4xl font-extrabold text-white tracking-wide font-sans shadow-inner">
            <span>&quot;{reconstructedText}&quot;</span>
            {revealedChars < originalMessage.length && (
              <span className="inline-block w-2.5 h-7 bg-cyan-400 ml-1 animate-pulse" />
            )}
          </div>
        </div>

        {/* Philosophical Educational Climax Quotes */}
        <div className="max-w-2xl mx-auto space-y-3 mb-10 text-slate-300 font-sans">
          <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
            &quot;The internet isn&apos;t a cloud.&quot;
          </p>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            &quot;Behind every Send button is a journey through thousands of miles of physical glass fiber, deep ocean beds, laser switches, and silicon chips.&quot;
          </p>
        </div>

        {/* Replay Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onReplay}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wider uppercase flex items-center gap-2.5 transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-400/40"
          >
            <RefreshCw className="w-4 h-4 text-slate-950" />
            <span>TRANSMIT ANOTHER MESSAGE</span>
          </button>
        </div>
      </div>
    </section>
  );
};
