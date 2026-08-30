import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  NetworkNode as INetworkNode,
  NetworkStage,
  Packet,
  SimulationConfig,
  SimulationStats as ISimulationStats,
  SimulationStatus,
} from './types/network';
import {
  calculateBestPath,
  generateMultipathRoutes,
  INITIAL_NODES,
} from './simulation/networkGraph';
import {
  calculateEdgePosition,
  createPacketsFromMessage,
} from './simulation/simulationEngine';
import { soundSynth } from './simulation/audioSynth';
import { AccessibilityBar } from './components/AccessibilityBar';
import { Hero } from './components/Hero';
import { MessageInput } from './components/MessageInput';
import { JourneyVisualization } from './components/JourneyVisualization';
import { NetworkControls } from './components/NetworkControls';
import { SimulationStats } from './components/SimulationStats';
import { StageExplanation } from './components/StageExplanation';
import { ReconstructionMoment } from './components/ReconstructionMoment';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { PacketDetailModal } from './components/PacketDetailModal';

export const App: React.FC = () => {
  // Config state
  const [config, setConfig] = useState<SimulationConfig>({
    message: 'Hello from Coimbatore 👋',
    protocol: 'TCP',
    speedMultiplier: 1.0,
    baseLatencyMs: 65,
    congestionLevel: 0,
    packetLossRate: 0,
    packetCount: 4,
  });

  // Simulation state
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [nodes, setNodes] = useState<INetworkNode[]>(INITIAL_NODES);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [reassemblyBuffer, setReassemblyBuffer] = useState<(Packet | null)[]>([]);
  const [activeStage, setActiveStage] = useState<NetworkStage | 'packetizing' | 'delivered'>('device');
  const [disabledNodeIds, setDisabledNodeIds] = useState<string[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [selectedNode, setSelectedNode] = useState<INetworkNode | null>(null);

  // Telemetry HUD stats
  const [stats, setStats] = useState<ISimulationStats>({
    packetsCreated: 0,
    packetsDelivered: 0,
    packetsDropped: 0,
    retransmissions: 0,
    nodesCrossed: 0,
    avgLatencyMs: 65,
    startTime: 0,
    elapsedTimeMs: 0,
    currentStage: 'device',
  });

  // Accessibility & options
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('Welcome to PACKET. Press Send to begin the simulation.');

  // Animation frame & timer references
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const retransmitTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Update config helper
  const handleChangeConfig = (newConfig: Partial<SimulationConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (newConfig.congestionLevel !== undefined) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (['subsea_cable', 'core_north', 'core_south', 'ixp_exchange'].includes(n.id)) {
              return {
                ...n,
                status: disabledNodeIds.includes(n.id)
                  ? 'disabled'
                  : updated.congestionLevel > 40
                  ? 'congested'
                  : 'online',
              };
            }
            return n;
          })
        );
      }
      return updated;
    });
  };

  // Announce helper for screen readers
  const announce = (msg: string) => {
    setLiveAnnouncement(msg);
  };

  // Node toggle (disable / enable)
  const handleToggleNode = (nodeId: string) => {
    const isCurrentlyDisabled = disabledNodeIds.includes(nodeId);
    let newDisabled: string[];

    if (isCurrentlyDisabled) {
      newDisabled = disabledNodeIds.filter((id) => id !== nodeId);
      announce(`Node ${nodeId} restored online.`);
    } else {
      newDisabled = [...disabledNodeIds, nodeId];
      soundSynth.playRerouteWarning();
      announce(`Node ${nodeId} disabled. In-flight packets rerouting.`);
    }

    setDisabledNodeIds(newDisabled);
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: isCurrentlyDisabled ? 'online' : 'disabled',
          };
        }
        return n;
      })
    );
  };

  // Disable Random Node button
  const handleDisableRandomNode = () => {
    const candidateNodes = nodes.filter((n) => n.canBeDisabled && !disabledNodeIds.includes(n.id));
    if (candidateNodes.length === 0) return;

    const randomNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)];
    handleToggleNode(randomNode.id);
  };

  // Reset all nodes
  const handleResetNodes = () => {
    setDisabledNodeIds([]);
    setNodes(INITIAL_NODES);
    announce('All network nodes restored online.');
  };

  // Reset entire simulation
  const handleReset = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    retransmitTimersRef.current.forEach(clearTimeout);
    retransmitTimersRef.current = [];

    setStatus('idle');
    setPackets([]);
    setReassemblyBuffer([]);
    setActiveStage('device');
    setSelectedPacket(null);
    setSelectedNode(null);
    setStats({
      packetsCreated: 0,
      packetsDelivered: 0,
      packetsDropped: 0,
      retransmissions: 0,
      nodesCrossed: 0,
      avgLatencyMs: config.baseLatencyMs,
      startTime: 0,
      elapsedTimeMs: 0,
      currentStage: 'device',
    });
    announce('Simulation reset.');
  }, [config.baseLatencyMs]);

  // Start Transmission / Send
  const handleSend = () => {
    handleReset();
    setStatus('packetizing');
    setActiveStage('packetizing');
    announce(`Message "${config.message}" is being divided into ${config.packetCount} packets.`);

    // After brief packetization delay, launch packets into transmission
    setTimeout(() => {
      const initialPackets = createPacketsFromMessage(config.message, config, disabledNodeIds);
      setPackets(initialPackets);
      setReassemblyBuffer(new Array(initialPackets.length).fill(null));
      setStatus('transmitting');
      setActiveStage('device');
      setStats((prev) => ({
        ...prev,
        packetsCreated: initialPackets.length,
        startTime: performance.now(),
      }));

      soundSynth.playPacketEmit(0);
      announce('Packets launched from your device into the network.');
    }, 1100);
  };

  // Toggle Pause
  const handleTogglePause = () => {
    if (status === 'transmitting') {
      setStatus('paused');
      announce('Simulation paused.');
    } else if (status === 'paused') {
      setStatus('transmitting');
      lastTimeRef.current = performance.now();
      announce('Simulation resumed.');
    }
  };

  // Main Simulation Animation Loop (requestAnimationFrame)
  useEffect(() => {
    if (status !== 'transmitting') {
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (currentTime: number) => {
      const deltaMs = Math.min(currentTime - lastTimeRef.current, 100);
      lastTimeRef.current = currentTime;

      setPackets((prevPackets) => {
        if (prevPackets.length === 0) return prevPackets;

        let anyInFlight = false;
        let highestStageIndex = 0;
        const stageOrder: NetworkStage[] = ['device', 'router', 'internet', 'datacenter', 'destination'];

        const nodeMap = new Map(nodes.map((n) => [n.id, n]));

        const updatedPackets = prevPackets.map((pkt, idx) => {
          if (pkt.status === 'delivered' || pkt.status === 'dropped') {
            return pkt;
          }

          if (pkt.status === 'queue') {
            const releaseDelay = (idx * 280) / config.speedMultiplier;
            const timeSinceStart = currentTime - stats.startTime;

            if (timeSinceStart >= releaseDelay) {
              soundSynth.playPacketEmit(pkt.seq);
              return {
                ...pkt,
                status: 'in_flight' as const,
                segmentProgress: 0,
              };
            }
            anyInFlight = true;
            return pkt;
          }

          if (pkt.status === 'in_flight' || pkt.status === 'rerouted') {
            anyInFlight = true;
            const fromNodeId = pkt.currentPath[pkt.currentNodeIndex];
            const toNodeId = pkt.currentPath[pkt.currentNodeIndex + 1];

            const fromNode = nodeMap.get(fromNodeId);
            const toNode = nodeMap.get(toNodeId);

            if (!fromNode || !toNode) {
              return pkt;
            }

            const currentStageIdx = stageOrder.indexOf(fromNode.stage);
            if (currentStageIdx > highestStageIndex) {
              highestStageIndex = currentStageIdx;
            }

            if (disabledNodeIds.includes(toNodeId)) {
              const newSubPath = calculateBestPath(fromNodeId, 'destination', disabledNodeIds, config.congestionLevel);
              if (newSubPath.length > 1) {
                soundSynth.playRerouteWarning();
                announce(`Packet #${pkt.seq} rerouted around disabled node ${toNode.label}.`);
                return {
                  ...pkt,
                  currentPath: [...pkt.currentPath.slice(0, pkt.currentNodeIndex), ...newSubPath],
                  status: 'rerouted' as const,
                  segmentProgress: 0,
                };
              } else {
                soundSynth.playPacketDrop();
                setStats((s) => ({ ...s, packetsDropped: s.packetsDropped + 1 }));
                return {
                  ...pkt,
                  status: 'dropped' as const,
                };
              }
            }

            let progressStep = 0.0012 * deltaMs * config.speedMultiplier;

            if (config.congestionLevel > 0 && ['subsea_cable', 'core_north', 'core_south'].includes(toNodeId)) {
              progressStep *= Math.max(0.3, 1 - (config.congestionLevel / 100) * 0.7);
            }

            const nextProgress = pkt.segmentProgress + progressStep;

            if (nextProgress < 1.0) {
              const pos = calculateEdgePosition(fromNode, toNode, nextProgress);
              return {
                ...pkt,
                segmentProgress: nextProgress,
                x: pos.x,
                y: pos.y,
              };
            } else {
              const nextNodeIndex = pkt.currentNodeIndex + 1;

              soundSynth.playNodeHop();
              setStats((s) => ({ ...s, nodesCrossed: s.nodesCrossed + 1 }));

              if (toNodeId === 'destination') {
                soundSynth.playReassembleSlot(pkt.seq - 1);
                
                setReassemblyBuffer((buf) => {
                  const copy = [...buf];
                  copy[pkt.seq - 1] = pkt;
                  return copy;
                });

                setStats((s) => ({ ...s, packetsDelivered: s.packetsDelivered + 1 }));

                return {
                  ...pkt,
                  status: 'delivered' as const,
                  currentNodeIndex: nextNodeIndex,
                  segmentProgress: 1.0,
                  x: toNode.x,
                  y: toNode.y,
                };
              }

              if (
                config.packetLossRate > 0 &&
                toNode.stage === 'internet' &&
                Math.random() < config.packetLossRate / 100
              ) {
                soundSynth.playPacketDrop();
                setStats((s) => ({ ...s, packetsDropped: s.packetsDropped + 1 }));
                announce(`Packet #${pkt.seq} was dropped due to simulated network noise.`);

                if (config.protocol === 'TCP') {
                  const timer = setTimeout(() => {
                    setStats((s) => ({ ...s, retransmissions: s.retransmissions + 1 }));
                    setPackets((curr) => {
                      const newPkt: Packet = {
                        ...pkt,
                        id: `retx-${Date.now()}-${pkt.seq}`,
                        isRetransmission: true,
                        status: 'in_flight',
                        currentNodeIndex: 0,
                        segmentProgress: 0,
                        x: nodes[0].x,
                        y: nodes[0].y,
                        currentPath: generateMultipathRoutes(pkt.seq, disabledNodeIds, config.congestionLevel),
                      };
                      return [...curr.filter((p) => p.id !== pkt.id), newPkt];
                    });
                    soundSynth.playPacketEmit(pkt.seq);
                    announce(`TCP Retransmission: Resending Packet #${pkt.seq}.`);
                  }, 1200 / config.speedMultiplier);

                  retransmitTimersRef.current.push(timer);
                }

                return {
                  ...pkt,
                  status: 'dropped' as const,
                  x: toNode.x,
                  y: toNode.y,
                };
              }

              return {
                ...pkt,
                currentNodeIndex: nextNodeIndex,
                segmentProgress: 0,
                x: toNode.x,
                y: toNode.y,
              };
            }
          }

          return pkt;
        });

        setActiveStage(stageOrder[highestStageIndex] || 'device');

        const allCompleted = updatedPackets.every(
          (p) => p.status === 'delivered' || (p.status === 'dropped' && config.protocol === 'UDP')
        );

        if (allCompleted && updatedPackets.length > 0 && !anyInFlight) {
          setStatus('delivered');
          setActiveStage('delivered');
          soundSynth.playDeliveredChord();
          announce(`All packets delivered! Reconstructed message: "${config.message}".`);
        }

        return updatedPackets;
      });

      if (status === 'transmitting') {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [status, config, disabledNodeIds, nodes, stats.startTime]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (status === 'idle' || status === 'delivered') {
          handleSend();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleDisableRandomNode();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const next = !soundEnabled;
        setSoundEnabled(next);
        soundSynth.setEnabled(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, soundEnabled, handleReset]);

  const scrollToJourney = () => {
    document.getElementById('message-input-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Accessibility Controls & Live Region */}
      <AccessibilityBar
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={setReducedMotion}
        liveAnnouncement={liveAnnouncement}
      />

      {/* 1. HERO SECTION */}
      <Hero onStartClick={scrollToJourney} />

      {/* Main Simulation Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-2">
        {/* 2. MESSAGE INPUT & TRANSMISSION CONTROLS */}
        <MessageInput
          config={config}
          onChangeConfig={handleChangeConfig}
          onSend={handleSend}
          onReset={handleReset}
          status={status}
        />

        {/* 3 & 4 & 5. JOURNEY VISUALIZATION (SVG CANVAS & MESH) */}
        <JourneyVisualization
          nodes={nodes}
          packets={packets}
          config={config}
          status={status}
          onToggleNode={handleToggleNode}
          onSelectNode={(node) => setSelectedNode(node)}
          onSelectPacket={(pkt) => setSelectedPacket(pkt)}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
          selectedPacket={selectedPacket}
          selectedNode={selectedNode}
          reducedMotion={reducedMotion}
        />

        {/* 8. CONTEXTUAL STAGE EXPLANATION */}
        <StageExplanation stage={activeStage} />

        {/* 7. LIVE SIMULATION TELEMETRY HUD */}
        <SimulationStats
          stats={stats}
          status={status}
          protocol={config.protocol}
          totalPackets={packets.length}
        />

        {/* 6. NETWORK LAB: "BREAK THE NETWORK" */}
        <NetworkControls
          config={config}
          onChangeConfig={handleChangeConfig}
          onDisableRandomNode={handleDisableRandomNode}
          disabledNodeIds={disabledNodeIds}
          onResetNodes={handleResetNodes}
        />

        {/* 9. FINAL MOMENT: MESSAGE REASSEMBLY & CLIMAX */}
        {status === 'delivered' && (
          <ReconstructionMoment
            reassemblyBuffer={reassemblyBuffer}
            originalMessage={config.message}
            onReplay={handleSend}
            reducedMotion={reducedMotion}
          />
        )}

        {/* 10. HOW IT WORKS EDUCATIONAL GUIDE */}
        <HowItWorks />
      </main>

      {/* Packet Deep Inspection Modal */}
      <PacketDetailModal
        packet={selectedPacket}
        onClose={() => setSelectedPacket(null)}
      />

      {/* 14. FOOTER */}
      <Footer />
    </div>
  );
};

export default App;
