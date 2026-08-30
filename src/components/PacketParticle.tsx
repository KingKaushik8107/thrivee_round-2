import React, { useState } from 'react';
import type { Packet } from '../types/network';

interface PacketParticleProps {
  packet: Packet;
  onSelectPacket: (packet: Packet) => void;
  isSelected?: boolean;
}

export const PacketParticle: React.FC<PacketParticleProps> = ({
  packet,
  onSelectPacket,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (packet.status === 'queue') {
    return null;
  }

  const isDropped = packet.status === 'dropped';
  const isRerouted = packet.status === 'rerouted';
  const isRetx = packet.isRetransmission;

  const color = isDropped
    ? '#f43f5e'
    : isRetx
    ? '#f59e0b'
    : isRerouted
    ? '#a855f7'
    : '#00f0ff';

  return (
    <g
      transform={`translate(${packet.x}, ${packet.y})`}
      className="cursor-pointer select-none"
      onClick={() => onSelectPacket(packet)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`Packet ${packet.seq} of ${packet.totalPackets}. Payload fragment: "${packet.payload}". Status: ${packet.status}.`}
    >
      {/* Particle Drop / Disintegration Effect */}
      {isDropped ? (
        <g className="animate-ping" opacity="0.8">
          <circle r="18" fill="none" stroke="#f43f5e" strokeWidth="2" />
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#f43f5e" strokeWidth="2" />
          <line x1="8" y1="-8" x2="-8" y2="8" stroke="#f43f5e" strokeWidth="2" />
          <text y="24" textAnchor="middle" fill="#fb7185" fontSize="10" fontWeight="bold" fontFamily="monospace">
            DROPPED (LOSS)
          </text>
        </g>
      ) : (
        <>
          {/* Luminous Particle Ambient Aura */}
          <circle
            r={isHovered ? 20 : 14}
            fill={color}
            opacity={0.25}
            className="animate-pulse"
            style={{ filter: `drop-shadow(0 0 12px ${color})` }}
          />

          {/* Packet Particle Pill Body */}
          <rect
            x="-18"
            y="-10"
            width="36"
            height="20"
            rx="10"
            fill="#060c18"
            stroke={color}
            strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
            filter="drop-shadow(0 2px 8px rgba(0,0,0,0.6))"
          />

          {/* Packet Core Indicator Light */}
          <circle cx="-8" cy="0" r="3" fill={color} className="animate-ping" style={{ animationDuration: '1.5s' }} />

          {/* Packet Sequence Label */}
          <text
            x="4"
            y="3.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            P{packet.seq}
          </text>

          {/* Retransmission / Reroute Flag Tag */}
          {isRetx && (
            <g transform="translate(0, -18)">
              <rect x="-16" y="0" width="32" height="11" rx="3" fill="#f59e0b" />
              <text x="0" y="8" textAnchor="middle" fill="#000" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                RE-TX
              </text>
            </g>
          )}

          {isRerouted && !isRetx && (
            <g transform="translate(0, -18)">
              <rect x="-20" y="0" width="40" height="11" rx="3" fill="#a855f7" />
              <text x="0" y="8" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                REROUTED
              </text>
            </g>
          )}

          {/* Hover Preview Card */}
          {isHovered && (
            <g transform="translate(0, -55)" className="pointer-events-none z-50">
              <rect
                x="-85"
                y="0"
                width="170"
                height="46"
                rx="6"
                fill="#0a1020"
                stroke={color}
                strokeWidth="1.2"
                opacity="0.95"
                filter="drop-shadow(0 4px 14px rgba(0,0,0,0.8))"
              />
              <text x="0" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PACKET #{packet.seq} ({packet.protocol})
              </text>
              <text x="0" y="27" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="monospace">
                Payload: &quot;{packet.payload}&quot;
              </text>
              <text x="0" y="39" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                Seq: {packet.seq * 1024} • Checksum: {packet.checksum}
              </text>
            </g>
          )}
        </>
      )}
    </g>
  );
};
