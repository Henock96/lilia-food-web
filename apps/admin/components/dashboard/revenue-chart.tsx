'use client';

import type { RevenueDataPoint } from '@lilia/types';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatXAF(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartH = 140;
  const chartW = 100; // viewBox percentage

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: chartH - (d.revenue / maxRevenue) * chartH,
    ...d,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1]!.x} ${chartH} L 0 ${chartH} Z`;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Revenus</h3>
          <p className="text-xs text-zinc-400 mt-0.5">30 derniers jours</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {data.reduce((s, d) => s + d.revenue, 0).toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-xs text-zinc-400">{data.reduce((s, d) => s + d.orders, 0)} commandes</p>
        </div>
      </div>

      <svg
        viewBox={`0 0 100 ${chartH}`}
        className="w-full overflow-visible"
        style={{ height: chartH }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#revenueGradient)" />
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#f97316" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* X axis labels */}
      <div className="flex justify-between mt-2">
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].filter(Boolean).map((p, i) => (
          <span key={i} className="text-xs text-zinc-400">{formatDate(p!.date)}</span>
        ))}
      </div>

      {/* Y axis hint */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-zinc-400">0</span>
        <span className="text-xs text-zinc-400">{formatXAF(maxRevenue)} FCFA</span>
      </div>
    </div>
  );
}
