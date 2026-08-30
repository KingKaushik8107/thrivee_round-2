import type { NetworkEdge, NetworkNode } from '../types/network';

export const INITIAL_NODES: NetworkNode[] = [
  {
    id: 'device',
    label: 'Your Device',
    sublabel: 'Source Client',
    stage: 'device',
    x: 80,
    y: 300,
    status: 'online',
    type: 'device',
    ip: '192.168.1.42',
    location: 'Coimbatore, India',
    latencyBase: 0,
    description: 'Generates user data at the application layer, chunks payload into segments, and adds TCP/IP headers.',
    bufferQueue: 0,
    canBeDisabled: false,
  },
  {
    id: 'router',
    label: 'Home Gateway',
    sublabel: 'Wi-Fi / Fiber ONT',
    stage: 'router',
    x: 210,
    y: 300,
    status: 'online',
    type: 'router',
    ip: '192.168.1.1',
    location: 'Local Network',
    latencyBase: 2,
    description: 'Performs Network Address Translation (NAT) and encapsulates packets onto your local ISP line.',
    bufferQueue: 0,
    canBeDisabled: false,
  },
  {
    id: 'isp_edge',
    label: 'ISP Edge Router',
    sublabel: 'Metro Ingress',
    stage: 'internet',
    x: 350,
    y: 300,
    status: 'online',
    type: 'router',
    ip: '103.21.244.2',
    location: 'Regional ISP Point',
    latencyBase: 8,
    description: 'Aggregates subscriber connections and selects initial autonomous system (AS) transit routing paths.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'core_north',
    label: 'Tier-1 Backbone A',
    sublabel: 'Continental Fiber',
    stage: 'internet',
    x: 500,
    y: 150,
    status: 'online',
    type: 'fiber',
    ip: '198.32.160.10',
    location: 'Mumbai Exchange',
    latencyBase: 14,
    description: 'Ultra-high-throughput optical backbone routing terabits per second across terrestrial fiber.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'subsea_cable',
    label: 'Subsea Fiber Cable',
    sublabel: 'Deep Ocean Link',
    stage: 'internet',
    x: 520,
    y: 300,
    status: 'online',
    type: 'fiber',
    ip: '195.66.224.1',
    location: 'Arabian Sea Cable',
    latencyBase: 22,
    description: 'Armored transoceanic glass cables carrying laser pulses along the ocean floor across thousands of miles.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'satellite_relay',
    label: 'LEO Satellite Relay',
    sublabel: 'Orbital Mesh Link',
    stage: 'internet',
    x: 500,
    y: 450,
    status: 'online',
    type: 'satellite',
    ip: '172.64.80.5',
    location: 'Low Earth Orbit (550km)',
    latencyBase: 35,
    description: 'Laser-linked satellite constellation providing high-altitude backup and remote connectivity.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'ixp_exchange',
    label: 'IXP Exchange',
    sublabel: 'Carrier Peering Point',
    stage: 'internet',
    x: 680,
    y: 190,
    status: 'online',
    type: 'ixp',
    ip: '193.0.14.129',
    location: 'Marseille IXP',
    latencyBase: 28,
    description: 'Internet Exchange Point where major ISPs and cloud networks peer directly to exchange traffic without tolls.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'core_south',
    label: 'Tier-1 Backbone B',
    sublabel: 'Regional Transit',
    stage: 'internet',
    x: 680,
    y: 410,
    status: 'online',
    type: 'fiber',
    ip: '206.108.35.1',
    location: 'Frankfurt Hub',
    latencyBase: 26,
    description: 'Secondary high-capacity continental corridor providing failover resilience and traffic load balancing.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'edge_pop',
    label: 'Edge Cloud PoP',
    sublabel: 'Anycast Node',
    stage: 'internet',
    x: 830,
    y: 300,
    status: 'online',
    type: 'router',
    ip: '104.244.42.129',
    location: 'London Edge PoP',
    latencyBase: 34,
    description: 'Anycast edge location terminating TLS, caching static assets, and proxying traffic to the destination origin.',
    bufferQueue: 0,
    canBeDisabled: true,
  },
  {
    id: 'datacenter_lb',
    label: 'Data Center Gateway',
    sublabel: 'Load Balancer & WAF',
    stage: 'datacenter',
    x: 970,
    y: 300,
    status: 'online',
    type: 'datacenter',
    ip: '10.0.4.1',
    location: 'Primary Cloud DC',
    latencyBase: 38,
    description: 'Inspects packet headers, filters malicious requests, and distributes incoming connections to application servers.',
    bufferQueue: 0,
    canBeDisabled: false,
  },
  {
    id: 'destination',
    label: 'Target Server',
    sublabel: 'Application Endpoint',
    stage: 'destination',
    x: 1110,
    y: 300,
    status: 'online',
    type: 'server',
    ip: '104.244.42.1',
    location: 'Cloud Cluster',
    latencyBase: 42,
    description: 'Receives fragmented packets, reorders sequences, validates checksums, and delivers the full message.',
    bufferQueue: 0,
    canBeDisabled: false,
  },
];

export const NETWORK_EDGES: NetworkEdge[] = [
  { id: 'e-dev-rtr', from: 'device', to: 'router', weight: 3, type: 'lan', label: 'Wi-Fi 6', distanceKm: 0.01 },
  { id: 'e-rtr-isp', from: 'router', to: 'isp_edge', weight: 8, type: 'wan_fiber', label: 'FTTH Fiber', distanceKm: 12 },
  
  // ISP Outgoing routes
  { id: 'e-isp-coreA', from: 'isp_edge', to: 'core_north', weight: 14, type: 'wan_fiber', label: 'Metro Ring', distanceKm: 850, curveOffset: -20 },
  { id: 'e-isp-subsea', from: 'isp_edge', to: 'subsea_cable', weight: 12, type: 'undersea', label: 'Coastal Landing', distanceKm: 1200 },
  { id: 'e-isp-sat', from: 'isp_edge', to: 'satellite_relay', weight: 26, type: 'satellite', label: 'Uplink (Ka-Band)', distanceKm: 650, curveOffset: 20 },
  
  // Internet Mesh Cross-links
  { id: 'e-coreA-ixp', from: 'core_north', to: 'ixp_exchange', weight: 12, type: 'wan_fiber', label: 'Trans-Eurasia', distanceKm: 4200 },
  { id: 'e-coreA-subsea', from: 'core_north', to: 'subsea_cable', weight: 10, type: 'wan_fiber', label: 'Cross-connect', distanceKm: 400, curveOffset: 15 },
  { id: 'e-subsea-ixp', from: 'subsea_cable', to: 'ixp_exchange', weight: 14, type: 'undersea', label: 'Suez Channel Link', distanceKm: 5800, curveOffset: -15 },
  { id: 'e-subsea-coreB', from: 'subsea_cable', to: 'core_south', weight: 15, type: 'undersea', label: 'Gibraltar Landing', distanceKm: 6100, curveOffset: 15 },
  { id: 'e-sat-coreB', from: 'satellite_relay', to: 'core_south', weight: 22, type: 'satellite', label: 'Laser Crosslink', distanceKm: 1800 },
  { id: 'e-sat-subsea', from: 'satellite_relay', to: 'subsea_cable', weight: 18, type: 'satellite', label: 'Ground Feeder', distanceKm: 950, curveOffset: -15 },
  { id: 'e-coreA-coreB', from: 'core_north', to: 'core_south', weight: 16, type: 'wan_fiber', label: 'Central Interconnect', distanceKm: 900 },
  
  // Core to Edge PoP
  { id: 'e-ixp-edge', from: 'ixp_exchange', to: 'edge_pop', weight: 10, type: 'wan_fiber', label: 'Metro Peering', distanceKm: 320, curveOffset: -15 },
  { id: 'e-coreB-edge', from: 'core_south', to: 'edge_pop', weight: 11, type: 'wan_fiber', label: 'Regional Backhaul', distanceKm: 450, curveOffset: 15 },
  { id: 'e-subsea-edge', from: 'subsea_cable', to: 'edge_pop', weight: 16, type: 'undersea', label: 'Direct Edge Feed', distanceKm: 1400 },

  // Edge to Data Center and Destination
  { id: 'e-edge-dc', from: 'edge_pop', to: 'datacenter_lb', weight: 8, type: 'wan_fiber', label: 'Cloud Interconnect', distanceKm: 80 },
  { id: 'e-dc-dest', from: 'datacenter_lb', to: 'destination', weight: 4, type: 'datacenter_internal', label: '100GbE Spine', distanceKm: 0.1 },
];

export function getEdgeSvgPath(fromNode: NetworkNode, toNode: NetworkNode, curveOffset: number = 0): string {
  if (curveOffset === 0) {
    return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  }
  const midX = (fromNode.x + toNode.x) / 2;
  const midY = (fromNode.y + toNode.y) / 2 + curveOffset;
  return `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY} ${toNode.x} ${toNode.y}`;
}

export function buildAdjacencyMap() {
  const map = new Map<string, { to: string; edge: NetworkEdge }[]>();
  
  INITIAL_NODES.forEach((n) => map.set(n.id, []));
  
  NETWORK_EDGES.forEach((edge) => {
    map.get(edge.from)?.push({ to: edge.to, edge });
    if (['core_north', 'core_south', 'subsea_cable', 'satellite_relay', 'ixp_exchange'].includes(edge.from) &&
        ['core_north', 'core_south', 'subsea_cable', 'satellite_relay', 'ixp_exchange'].includes(edge.to)) {
      map.get(edge.to)?.push({ to: edge.from, edge });
    }
  });
  
  return map;
}

export function calculateBestPath(
  startId: string,
  targetId: string,
  disabledNodeIds: string[],
  congestionLevel: number,
  preferredSubPath?: string[]
): string[] {
  const disabledSet = new Set(disabledNodeIds);
  
  if (disabledSet.has(startId) || disabledSet.has(targetId)) {
    return [];
  }

  const adj = buildAdjacencyMap();
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  INITIAL_NODES.forEach((node) => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    if (!disabledSet.has(node.id)) {
      unvisited.add(node.id);
    }
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((nodeId) => {
      const dist = distances.get(nodeId) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    });

    if (!current || minDistance === Infinity || current === targetId) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adj.get(current) || [];
    for (const { to: neighborId, edge } of neighbors) {
      if (!unvisited.has(neighborId)) continue;

      let edgeWeight = edge.weight;
      
      if (congestionLevel > 0) {
        if (edge.type === 'undersea' || edge.type === 'wan_fiber') {
          edgeWeight += (congestionLevel / 100) * 15;
        }
      }

      if (preferredSubPath && preferredSubPath.includes(neighborId)) {
        edgeWeight *= 0.7;
      }

      const totalDist = distances.get(current)! + edgeWeight;
      if (totalDist < (distances.get(neighborId) ?? Infinity)) {
        distances.set(neighborId, totalDist);
        previous.set(neighborId, current);
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = targetId;

  while (curr) {
    path.unshift(curr);
    curr = previous.get(curr) ?? null;
    if (curr === startId) {
      path.unshift(startId);
      break;
    }
  }

  return path[0] === startId ? path : [];
}

export function generateMultipathRoutes(
  packetIndex: number,
  disabledNodeIds: string[],
  congestionLevel: number
): string[] {
  const multipathWaypoints: string[][] = [
    ['subsea_cable', 'ixp_exchange'],
    ['core_north', 'ixp_exchange'],
    ['subsea_cable', 'core_south'],
    ['satellite_relay', 'core_south'],
    ['core_north', 'core_south'],
    ['satellite_relay', 'subsea_cable'],
  ];

  const preferredWaypoints = multipathWaypoints[packetIndex % multipathWaypoints.length];
  const path = calculateBestPath('device', 'destination', disabledNodeIds, congestionLevel, preferredWaypoints);
  
  if (path.length > 0) return path;

  return calculateBestPath('device', 'destination', disabledNodeIds, congestionLevel);
}

export const STAGE_EXPLANATIONS = {
  device: {
    stageKey: 'device',
    title: '1. Device Encapsulation',
    shortDescription: 'Your message starts as plaintext in memory, broken into packets with TCP/IP headers.',
    deepExplanation: 'Modern operating systems chop continuous application data (HTTP/2, WebSocket, etc.) into discrete segments conforming to the Maximum Transmission Unit (MTU ~1500 bytes). Each segment receives a TCP header (sequence numbers, ports, checksum) and an IPv4/IPv6 header containing source and destination addresses.',
    iconName: 'Laptop',
  },
  router: {
    stageKey: 'router',
    title: '2. Local Gateway & NAT',
    shortDescription: 'Your home router inspects packets and maps private IP (192.168.x.x) to a public IP.',
    deepExplanation: 'Through Network Address Translation (NAT), multiple local smart devices share a single public IPv4 address. The router modulates data bits into radio frequency (Wi-Fi 6) or infrared laser pulses down your home fiber optic line (FTTH ONT).',
    iconName: 'Wifi',
  },
  internet: {
    stageKey: 'internet',
    title: '3. The Global Internet Mesh',
    shortDescription: 'Packets traverse Autonomous Systems, undersea fiber, and carrier exchanges independently.',
    deepExplanation: 'The internet has no central director. Over 100,000 independent Autonomous Systems (AS) use Border Gateway Protocol (BGP) to announce routing tables. Packets from the same message can take completely different geographic paths across subsea fiber cables or satellites based on real-time link health and congestion.',
    iconName: 'Globe',
  },
  datacenter: {
    stageKey: 'datacenter',
    title: '4. Ingress & Load Balancing',
    shortDescription: 'The destination cloud gateway inspects, filters, and distributes incoming packets.',
    deepExplanation: 'Before reaching the application server, packets hit DDoS scrubbers, Web Application Firewalls (WAF), and Layer 4/7 Load Balancers. These inspect TCP SYN/ACK handshakes, terminate TLS encryption, and route packets across internal high-speed 100GbE data center switches.',
    iconName: 'Server',
  },
  destination: {
    stageKey: 'destination',
    title: '5. TCP Reassembly & Delivery',
    shortDescription: 'Out-of-order packets are sequence-sorted, checksums verified, and the message reconstructed.',
    deepExplanation: 'Packets frequently arrive out of order due to different routing path latencies. The destination TCP stack holds received segments in a socket buffer, sends ACK confirmations back to the sender, re-orders them by sequence number (SEQ), and passes the decoded message to the recipient app.',
    iconName: 'CheckCircle2',
  },
  packetizing: {
    stageKey: 'packetizing',
    title: 'Data Segmentation in Progress',
    shortDescription: 'Transforming text into binary chunks, assigning sequence numbers and TCP checksums...',
    deepExplanation: 'The internet cannot transmit unbounded text streams reliably. Breaking data into small packets ensures that a single dropped bit only requires retransmitting a few bytes rather than the entire message.',
    iconName: 'Cpu',
  },
  delivered: {
    stageKey: 'delivered',
    title: 'Mission Complete — Message Delivered',
    shortDescription: 'All packets survived the journey, passed checksum validation, and assembled flawlessly.',
    deepExplanation: 'Behind every single tap of "Send" or page load, billions of packets traverse thousands of kilometers of physical fiber at 200,000 km/s (two-thirds the speed of light in glass). The internet is not an abstract cloud—it is the largest physical machine ever built.',
    iconName: 'Award',
  },
};
