import type { NetworkNode, Packet, SimulationConfig } from '../types/network';
import { generateMultipathRoutes, INITIAL_NODES, NETWORK_EDGES } from './networkGraph';

export function stringToHex(str: string): string {
  let hex = '0x';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0');
  }
  return hex;
}

export function chunkMessage(text: string, count: number): string[] {
  if (!text || text.trim().length === 0) {
    text = 'Hello from Coimbatore 👋';
  }
  
  const chars = Array.from(text);
  const total = chars.length;
  const actualCount = Math.min(count, Math.max(2, total));
  const chunkSize = Math.ceil(total / actualCount);
  
  const chunks: string[] = [];
  for (let i = 0; i < actualCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total);
    if (start < total) {
      chunks.push(chars.slice(start, end).join(''));
    }
  }

  while (chunks.length < actualCount) {
    chunks.push('');
  }

  return chunks;
}

export function createPacketsFromMessage(
  message: string,
  config: SimulationConfig,
  disabledNodeIds: string[]
): Packet[] {
  const chunks = chunkMessage(message, config.packetCount);
  const total = chunks.length;
  const startNode = INITIAL_NODES.find((n) => n.id === 'device')!;

  return chunks.map((chunk, idx) => {
    const seq = idx + 1;
    const path = generateMultipathRoutes(idx, disabledNodeIds, config.congestionLevel);
    const checksum = '0x' + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');

    return {
      id: `pkt-${Date.now()}-${seq}`,
      seq,
      totalPackets: total,
      payload: chunk,
      binaryChunk: stringToHex(chunk),
      sourceIp: '192.168.1.42',
      destIp: '104.244.42.1',
      sourcePort: 51200 + seq,
      destPort: 443,
      ttl: 64,
      checksum,
      protocol: config.protocol,
      status: 'queue',
      currentPath: path.length > 0 ? path : ['device', 'router', 'isp_edge', 'subsea_cable', 'edge_pop', 'datacenter_lb', 'destination'],
      currentNodeIndex: 0,
      segmentProgress: 0,
      x: startNode.x,
      y: startNode.y,
      isRetransmission: false,
      hopHistory: [
        {
          nodeId: 'device',
          timestamp: Date.now(),
          latency: 0,
        },
      ],
    };
  });
}

export function calculateEdgePosition(
  fromNode: NetworkNode,
  toNode: NetworkNode,
  progress: number
): { x: number; y: number } {
  const edge = NETWORK_EDGES.find(
    (e) => (e.from === fromNode.id && e.to === toNode.id) || (e.from === toNode.id && e.to === fromNode.id)
  );

  const curveOffset = edge?.curveOffset ?? 0;

  if (curveOffset === 0) {
    return {
      x: fromNode.x + (toNode.x - fromNode.x) * progress,
      y: fromNode.y + (toNode.y - fromNode.y) * progress,
    };
  }

  const midX = (fromNode.x + toNode.x) / 2;
  const midY = (fromNode.y + toNode.y) / 2 + curveOffset;

  const t = Math.max(0, Math.min(1, progress));
  const invT = 1 - t;

  const x = invT * invT * fromNode.x + 2 * invT * t * midX + t * t * toNode.x;
  const y = invT * invT * fromNode.y + 2 * invT * t * midY + t * t * toNode.y;

  return { x, y };
}
