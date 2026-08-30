import React from 'react';
import { X, ShieldCheck, Cpu, ArrowRight, Activity, Clock, Terminal } from 'lucide-react';
import type { Packet } from '../types/network';

interface PacketDetailModalProps {
  packet: Packet | null;
  onClose: () => void;
}

export const PacketDetailModal: React.FC<PacketDetailModalProps> = ({ packet, onClose }) => {
  if (!packet) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="packet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.2)] text-slate-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </span>
            <div>
              <h3 id="packet-modal-title" className="text-lg sm:text-xl font-bold text-white font-mono flex items-center gap-2">
                <span>PACKET INSPECTOR</span>
                <span className="px-2 py-0.5 rounded text-xs bg-cyan-500 text-slate-950 font-bold">
                  SEQ #{packet.seq}/{packet.totalPackets}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Layer 3/4 Header &amp; Payload Dissection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
            aria-label="Close packet inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Payload Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Cpu className="w-4 h-4" /> PAYLOAD FRAGMENT
              </span>
              <span>Encapsulated Chunk</span>
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
              <div>
                <div className="text-xs text-slate-400">Plaintext Data:</div>
                <div className="text-base font-bold text-cyan-300 font-sans">&quot;{packet.payload}&quot;</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Hex Dump:</div>
                <div className="text-xs text-slate-300">{packet.binaryChunk}</div>
              </div>
            </div>
          </div>

          {/* Layer 3: IPv4 Header Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Internet Protocol (IPv4 Header)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Source IP</div>
                <div className="text-slate-200 font-semibold">{packet.sourceIp}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Destination IP</div>
                <div className="text-slate-200 font-semibold">{packet.destIp}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">TTL (Hops Left)</div>
                <div className="text-slate-200 font-semibold">{packet.ttl} hops</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Protocol</div>
                <div className="text-cyan-400 font-bold">{packet.protocol} (6)</div>
              </div>
            </div>
          </div>

          {/* Layer 4: TCP/UDP Transport Header Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Transport Layer ({packet.protocol} Segment)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Source Port</div>
                <div className="text-slate-200 font-semibold">{packet.sourcePort}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Dest Port</div>
                <div className="text-slate-200 font-semibold">{packet.destPort} (HTTPS)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Sequence No.</div>
                <div className="text-slate-200 font-semibold">{packet.seq * 1024 + 4821}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-500">Checksum</div>
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {packet.checksum}
                </div>
              </div>
            </div>
          </div>

          {/* Hop-by-Hop Route Traversal */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Assigned Routing Path
            </h4>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-2 font-mono text-xs">
              {packet.currentPath.map((nodeId, idx) => (
                <React.Fragment key={nodeId}>
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      idx <= packet.currentNodeIndex
                        ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {nodeId.replace('_', ' ')}
                  </span>
                  {idx < packet.currentPath.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Status: {packet.status.toUpperCase()}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
