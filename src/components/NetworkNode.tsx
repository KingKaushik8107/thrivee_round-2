import React, { useState } from 'react';
import type { NetworkNode as INetworkNode } from '../types/network';

interface NetworkNodeProps {
  node: INetworkNode;
  onToggleNode: (nodeId: string) => void;
  onSelectNode: (node: INetworkNode) => void;
  isSelected?: boolean;
}

export const NetworkNode: React.FC<NetworkNodeProps> = ({
  node,
  onToggleNode,
  onSelectNode,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isOnline = node.status === 'online';
  const isCongested = node.status === 'congested';
  const isDisabled = node.status === 'disabled';

  const getThemeColors = () => {
    if (isDisabled) {
      return {
        fill: '#1f0d11',
        stroke: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.6)',
        badgeBg: 'bg-rose-950/90 text-rose-300 border-rose-500/50',
      };
    }
    if (isCongested) {
      return {
        fill: '#241a0d',
        stroke: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.6)',
        badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
      };
    }
    if (node.stage === 'device' || node.stage === 'destination') {
      return {
        fill: '#081c24',
        stroke: '#00f0ff',
        glow: 'rgba(0, 240, 255, 0.7)',
        badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50',
      };
    }
    if (node.type === 'satellite') {
      return {
        fill: '#1b122c',
        stroke: '#c084fc',
        glow: 'rgba(192, 132, 252, 0.6)',
        badgeBg: 'bg-purple-950/90 text-purple-300 border-purple-500/50',
      };
    }
    if (node.id === 'subsea_cable') {
      return {
        fill: '#0a1d2e',
        stroke: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.6)',
        badgeBg: 'bg-sky-950/90 text-sky-300 border-sky-500/50',
      };
    }
    return {
      fill: '#0d1d1a',
      stroke: '#10b981',
      glow: 'rgba(16, 185, 129, 0.6)',
      badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
    };
  };

  const theme = getThemeColors();
  const radius = node.stage === 'device' || node.stage === 'destination' ? 26 : 22;

  return (
    <g
      className="cursor-pointer select-none transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (node.canBeDisabled) {
          onToggleNode(node.id);
        } else {
          onSelectNode(node);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${node.label} (${node.sublabel}), Status: ${node.status}, IP: ${node.ip}. Click to toggle health.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (node.canBeDisabled) {
            onToggleNode(node.id);
          } else {
            onSelectNode(node);
          }
        }
      }}
    >
      {/* Ambient Glow Filter */}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius + (isHovered ? 12 : 6)}
        fill="transparent"
        stroke={theme.stroke}
        strokeWidth={1}
        opacity={isDisabled ? 0.8 : 0.3}
        className={isDisabled ? 'animate-ping' : ''}
        style={{ filter: `drop-shadow(0 0 10px ${theme.glow})` }}
      />

      {/* Selected Indicator Ring */}
      {isSelected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={radius + 10}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={2}
          strokeDasharray="4 4"
          className="animate-spin"
          style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '6s' }}
        />
      )}

      {/* Main Node Circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={theme.fill}
        stroke={theme.stroke}
        strokeWidth={isHovered ? 2.5 : 2}
        className="transition-all duration-200"
      />

      {/* Center Core Indicator */}
      <circle
        cx={node.x}
        cy={node.y}
        r={isDisabled ? 4 : isHovered ? 8 : 6}
        fill={theme.stroke}
        opacity={isDisabled ? 0.4 : 0.9}
        className={isOnline ? 'animate-pulse' : ''}
      />

      {/* Disabled X Cross Overlay */}
      {isDisabled && (
        <g stroke="#f43f5e" strokeWidth={2.5} strokeLinecap="round">
          <line x1={node.x - 10} y1={node.y - 10} x2={node.x + 10} y2={node.y + 10} />
          <line x1={node.x + 10} y1={node.y - 10} x2={node.x - 10} y2={node.y + 10} />
        </g>
      )}

      {/* Stage Node Label */}
      <text
        x={node.x}
        y={node.y + radius + 18}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="12"
        fontWeight="600"
        fontFamily="sans-serif"
        className="tracking-tight pointer-events-none drop-shadow-md"
      >
        {node.label}
      </text>

      {/* Node Subtitle / Location */}
      <text
        x={node.x}
        y={node.y + radius + 32}
        textAnchor="middle"
        fill={isDisabled ? '#fb7185' : '#94a3b8'}
        fontSize="10"
        fontFamily="monospace"
        className="pointer-events-none"
      >
        {isDisabled ? 'OFFLINE (DROPPING)' : node.sublabel}
      </text>

      {/* Queue Indicator Badge if congested */}
      {isCongested && !isDisabled && (
        <g transform={`translate(${node.x + 12}, ${node.y - 24})`}>
          <rect width="20" height="14" rx="4" fill="#f59e0b" />
          <text x="10" y="10.5" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold" fontFamily="monospace">
            !
          </text>
        </g>
      )}

      {/* Hover Tooltip rendered in SVG */}
      {isHovered && (
        <g transform={`translate(${node.x}, ${node.y - radius - 85})`} className="pointer-events-none z-50">
          <rect
            x="-110"
            y="0"
            width="220"
            height="74"
            rx="8"
            fill="#0b1329"
            stroke={theme.stroke}
            strokeWidth="1.2"
            opacity="0.96"
            filter="drop-shadow(0 6px 16px rgba(0,0,0,0.7))"
          />
          <text x="0" y="18" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
            {node.label}
          </text>
          <text x="0" y="34" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
            IP: {node.ip} • {node.location}
          </text>
          <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            Base Latency: ~{node.latencyBase}ms | Status: {node.status.toUpperCase()}
          </text>
          <text x="0" y="64" textAnchor="middle" fill={node.canBeDisabled ? '#f59e0b' : '#64748b'} fontSize="9" fontFamily="sans-serif">
            {node.canBeDisabled ? '⚡ Click to toggle online/offline' : '🔒 Core endpoint'}
          </text>
        </g>
      )}
    </g>
  );
};
