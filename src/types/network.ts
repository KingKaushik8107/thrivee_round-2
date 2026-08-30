export type NetworkStage = 'device' | 'router' | 'internet' | 'datacenter' | 'destination';

export type NodeStatus = 'online' | 'congested' | 'disabled';

export type NodeType = 'device' | 'router' | 'fiber' | 'satellite' | 'ixp' | 'datacenter' | 'server';

export interface NetworkNode {
  id: string;
  label: string;
  sublabel: string;
  stage: NetworkStage;
  x: number;
  y: number;
  status: NodeStatus;
  type: NodeType;
  ip: string;
  location: string;
  latencyBase: number; // ms
  description: string;
  bufferQueue: number;
  canBeDisabled?: boolean;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  type: 'lan' | 'wan_fiber' | 'undersea' | 'satellite' | 'datacenter_internal';
  label: string;
  distanceKm: number;
  curveOffset?: number; // SVG quadratic curve control offset
}

export type PacketStatus = 'queue' | 'in_flight' | 'rerouted' | 'dropped' | 'retransmitting' | 'delivered';

export interface Packet {
  id: string;
  seq: number;
  totalPackets: number;
  payload: string;
  binaryChunk: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  ttl: number;
  checksum: string;
  protocol: 'TCP' | 'UDP';
  status: PacketStatus;
  currentPath: string[]; // List of node IDs to traverse
  currentNodeIndex: number; // Index in currentPath where the packet is coming from
  segmentProgress: number; // 0.0 to 1.0 along the edge between currentPath[currentNodeIndex] and currentPath[currentNodeIndex + 1]
  x: number;
  y: number;
  isRetransmission?: boolean;
  droppedAtNode?: string;
  color?: string;
  hopHistory: {
    nodeId: string;
    timestamp: number;
    latency: number;
  }[];
}

export type SimulationStatus = 'idle' | 'packetizing' | 'transmitting' | 'reassembling' | 'delivered' | 'paused';

export interface SimulationStats {
  packetsCreated: number;
  packetsDelivered: number;
  packetsDropped: number;
  retransmissions: number;
  nodesCrossed: number;
  avgLatencyMs: number;
  startTime: number;
  elapsedTimeMs: number;
  currentStage: NetworkStage;
}

export interface SimulationConfig {
  message: string;
  protocol: 'TCP' | 'UDP';
  speedMultiplier: number;
  baseLatencyMs: number;
  congestionLevel: number; // 0 to 100
  packetLossRate: number; // 0 to 50 %
  packetCount: number; // 4 to 8
}

export interface StageNarration {
  stageKey: NetworkStage | 'packetizing' | 'delivered';
  title: string;
  shortDescription: string;
  deepExplanation: string;
  iconName: string;
}
