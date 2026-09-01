import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Sliders } from 'lucide-react';
import type { RiskBreakdown } from '../types';

interface RiskBreakdownChartProps {
  breakdown: RiskBreakdown;
  totalScore: number;
}

export const RiskBreakdownChart: React.FC<RiskBreakdownChartProps> = ({
  breakdown,
  totalScore
}) => {
  if (!breakdown) return null;

  const data = [
    {
      name: 'ML Classifier',
      score: breakdown.ml?.score || 0,
      max: breakdown.ml?.max || 30,
      color: '#6366f1'
    },
    {
      name: 'Domain & Brand',
      score: breakdown.domain_brand?.score || 0,
      max: breakdown.domain_brand?.max || 25,
      color: '#ef4444'
    },
    {
      name: 'URL Analysis',
      score: breakdown.url?.score || 0,
      max: breakdown.url?.max || 20,
      color: '#f97316'
    },
    {
      name: 'Sender Identity',
      score: breakdown.sender?.score || 0,
      max: breakdown.sender?.max || 10,
      color: '#eab308'
    },
    {
      name: 'Content & Attach',
      score: breakdown.content?.score || 0,
      max: breakdown.content?.max || 10,
      color: '#ec4899'
    },
    {
      name: 'Threat Intel',
      score: breakdown.threat_intel?.score || 0,
      max: breakdown.threat_intel?.max || 5,
      color: '#06b6d4'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2 text-slate-200">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold font-mono tracking-wide">
            RISK FACTOR CONTRIBUTION BREAKDOWN
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Score: <strong className="text-white font-bold">{Math.round(totalScore)} / 100</strong>
        </div>
      </div>

      {/* Recharts Horizontal Bar Chart */}
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 75, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 30]} stroke="#64748b" fontSize={11} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff'
              }}
              formatter={(val: any, _name: any, item: any) => [
                `${val} / ${item.payload.max} pts`,
                'Contribution'
              ]}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabular breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between">
            <div className="text-slate-400 text-[11px] font-medium truncate">{item.name}</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold font-mono text-white">
                {item.score}
                <span className="text-slate-500 text-xs font-normal"> / {item.max}</span>
              </span>
              <span
                className="text-[10px] font-mono font-bold px-1 rounded"
                style={{ color: item.color, backgroundColor: `${item.color}15` }}
              >
                {Math.round((item.score / item.max) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
