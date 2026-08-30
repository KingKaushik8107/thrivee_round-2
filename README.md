# PACKET — The Journey You Never See

> **Visualizing the Invisible**: An interactive educational simulation that reveals how data travels across the global internet infrastructure.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646cff.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🌐 Concept & Overview

When you type a message like `"Hello from Coimbatore 👋"` and press **SEND**, what actually happens?

The internet is often conceptualized as an abstract "cloud," but behind every transmission lies thousands of kilometers of physical fiber optic cables under deep oceans, orbital satellite links, laser routers, and silicon microchips operating in microseconds.

**PACKET** transforms this invisible physical phenomenon into a real-time, cinematic, interactive educational simulation. It demonstrates how continuous application data is segmented into discrete MTU packets, routed through decentralized autonomous systems (AS), adapts to link disruptions, and reassembles perfectly at its destination.

> ⚠️ **Educational Note**: This application is an educational simulation. Network topology, packet counts, latency calculations, and routing behaviors are simulated for instructional and conceptual understanding.

---

## ✨ Key Features

### 1. 📡 Multi-Stage Network Visualization (Interactive SVG)
- **Your Device** (Application layer data generation & MTU chunking)
- **Local Router** (Network Address Translation - NAT & local Wi-Fi modulation)
- **Internet Core Mesh**:
  - *ISP Edge Router* (Regional ingress gateway)
  - *Tier-1 Backbone North* (Mumbai Continental Fiber Corridor)
  - *Transoceanic Subsea Cable* (Arabian Sea Deep Ocean Link)
  - *LEO Satellite Orbital Relay* (550km Low Earth Orbit Laser Link)
  - *IXP Exchange* (Marseille Carrier Peering Point)
  - *Tier-1 Backbone South* (Frankfurt Corridors)
  - *Edge Cloud PoP* (London Anycast Gateway)
- **Data Center Gateway** (Load Balancer, DDoS Scrubber & WAF)
- **Target Server / Destination** (TCP Socket Reassembly Buffer)

### 2. 🧩 Real-Time Packetization & Encapsulation
- Segments messages into numbered data chunks (4, 6, or 8 packets) with Unicode and emoji cluster preservation.
- Generates simulated IPv4 headers (`Source IP`, `Dest IP`, `TTL`, `Protocol`) and TCP transport segments (`Source Port`, `Dest Port`, `Sequence Numbers`, `CRC Checksums`).
- Interactive **Packet Inspector Modal**: Click any in-flight packet to dissect its simulated headers in real time.

### 3. 🗺️ Dynamic Dijkstra Routing & Multipath Failover
- Real-time path calculation across weighted mesh edges.
- Demonstrates **Multipath Routing**: Packets from the same message traverse different geographic routes to balance traffic load.
- In-flight adaptive rerouting when intermediate nodes fail or become congested.

### 4. ⚡ "BREAK THE NETWORK" Chaos Lab
- **Latency Slider**: Control simulation speed (0.25x slow-mo to 2.5x fast) and base network latency (25ms to 500ms).
- **Route Congestion**: Induces simulated buffer bloat, causing queues and forcing traffic along alternate corridors.
- **Packet Loss**: Injects drop rates (0% to 50%).
  - In **TCP Mode**: Triggers simulated retransmission timers and automatically resends lost packets with `[RE-TX]` badges.
  - In **UDP Mode**: Best-effort streaming without recovery, illustrating missing payload fragments on delivery.
- **"DISABLE RANDOM NODE" Button & Canvas Click**: Knocks out transit nodes and triggers immediate dynamic BGP rerouting.
- **Preset Scenarios**: *Pristine Terrestrial Fiber*, *Subsea Cable Severed*, *Peak Congestion Storm*, *Deep Orbit Satellite Link*, *Noisy Wireless*.

### 5. 🏆 Final Reassembly Climax
- Socket buffer slots populate as packets arrive (handling out-of-order arrival).
- Sequence sorting and CRC checksum verification.
- Decoded typewriter reveal of the original human message.
- "DELIVERED" badge and celebratory confetti burst.

### 6. 📖 Educational Knowledge Base
- 5 comprehensive interactive cards explaining:
  1. *Data Segmentation (Packets & MTU)*
  2. *Hop-by-Hop Routing (Routers & BGP)*
  3. *Multipath Routing (Decentralized Mesh)*
  4. *Surviving Congestion & Cable Cuts*
  5. *Reassembly & End-to-End Reliability (TCP vs UDP)*

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0 or higher recommended)
- npm or pnpm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/packet-simulation.git

# Navigate into project directory
cd packet-simulation

# Install dependencies
npm install
```

### Development Server
```bash
# Start the local development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|:---|
| <kbd>S</kbd> | Send message / Start simulation |
| <kbd>Space</kbd> | Pause / Resume simulation |
| <kbd>R</kbd> | Reset simulation to initial state |
| <kbd>N</kbd> | Break / Disable a random network node |
| <kbd>M</kbd> | Toggle Web Audio telemetry sound effects |

---

## ♿ Accessibility (WCAG 2.1 AA-oriented Accessibility Audit)

- **Screen Reader Announcements**: Uses `aria-live="polite"` to announce packet launches, stage transitions, node disruptions, and delivery results.
- **Reduced Motion Support**: Automatically respects `prefers-reduced-motion` and provides an in-app manual **Reduced Motion** toggle.
- **Keyboard Navigation**: Full keyboard tab order and dedicated shortcut commands.
- **High Contrast**: Meets WCAG AA and AAA color contrast requirements against the dark canvas.
- **Telemetry Audio Control**: Subtle Web Audio synthesizer is muted by default with an explicit audio toggle.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API (real-time synthesizer)
- **Celebration Effects**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
