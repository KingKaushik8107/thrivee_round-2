import React, { useState } from 'react';
import { Cpu, Compass, GitFork, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [openCard, setOpenCard] = useState<number | null>(null);

  const toggleCard = (index: number) => {
    setOpenCard(openCard === index ? null : index);
  };

  const steps = [
    {
      number: '01',
      title: 'Data is Divided into Packets',
      summary: 'Continuous files and messages are sliced into small, self-contained parcels with strict size limits (MTU).',
      deepDive: 'Sending an entire 4K movie or large text string as one unbroken stream is fragile. If a single bit corrupted, the entire file would need to start over from zero. Instead, data is segmented into ~1500-byte packets. If packet #42 is corrupted, only those 1500 bytes are retransmitted, saving bandwidth.',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      color: 'cyan',
    },
    {
      number: '02',
      title: 'Routers Forward Packets Hop-by-Hop',
      summary: 'Intermediate routers read packet destination IP addresses and consult local routing tables for the next best hop.',
      deepDive: 'No single computer knows the entire internet topology. Routers use Border Gateway Protocol (BGP) and Open Shortest Path First (OSPF) to discover neighbors. Like postal sorting offices, routers inspect the destination envelope, determine the fastest outgoing fiber link, and forward the packet in fractions of a microsecond.',
      icon: <Compass className="w-5 h-5 text-sky-400" />,
      color: 'sky',
    },
    {
      number: '03',
      title: 'Packets Can Take Different Routes (Multipath)',
      summary: 'Two packets from the very same message might travel completely different physical paths across the planet.',
      deepDive: 'Because the internet is a decentralized mesh, dynamic load balancers distribute packets across multiple subsea cables, terrestrial optical fibers, and satellite links. Packet #1 might fly through Mumbai to Marseille, while Packet #2 routes through Singapore and London, optimizing capacity in real time.',
      icon: <GitFork className="w-5 h-5 text-indigo-400" />,
      color: 'indigo',
    },
    {
      number: '04',
      title: 'Surviving Congestion and Physical Failures',
      summary: 'When undersea cables are cut by anchors or routers overload, the network self-heals by redirecting traffic.',
      deepDive: 'Buffer bloat occurs when routers receive more packets than their output lasers can transmit, causing buffer queues or dropped packets. Protocols like TCP detect packet loss, reduce transmission speed (congestion window back-off), and automatically reroute in-flight traffic around broken nodes.',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      color: 'amber',
    },
    {
      number: '05',
      title: 'The Destination Reconstructs the Data',
      summary: 'Out-of-order packets are re-ordered by sequence numbers, validated with checksums, and passed to the app.',
      deepDive: 'Because different routes have varying physical speeds, packet #3 might arrive before packet #1. The receiving operating system places packets into a socket buffer, verifies the mathematical CRC checksum to guarantee zero bit corruption, reassembles them in sequence, and hands the complete text to the user.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
    },
  ];

  return (
    <section
      id="how-it-works-section"
      aria-label="Educational Guide: How the Internet Actually Works"
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-16"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>FOUNDATIONAL CONCEPTS</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          How the Internet Actually Works
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mt-2 text-sm sm:text-base">
          Five core principles that power modern global communication across the invisible digital mesh.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isOpen = openCard === idx;
          return (
            <div
              key={step.number}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? 'bg-slate-900/95 border-cyan-500/50 shadow-[0_0_30px_rgba(0,240,255,0.15)]'
                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => toggleCard(idx)}
                className="w-full p-5 sm:p-6 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                aria-expanded={isOpen}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <span className="font-mono text-xl font-extrabold text-slate-600 sm:w-8">
                    {step.number}
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      {step.summary}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-slate-400 hover:text-white p-1">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-cyan-400" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 bg-slate-950/40 animate-fade-in">
                  <div className="text-xs font-mono font-bold text-cyan-400 uppercase mb-1">
                    ENGINEERING DEEP DIVE:
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {step.deepDive}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
