'use client';

import type { DashboardOrderStats } from '@lilia/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  EN_ATTENTE:    { label: 'En attente',   color: '#f59e0b' },
  PAYER:         { label: 'Payé',         color: '#3b82f6' },
  EN_PREPARATION:{ label: 'En préparation', color: '#8b5cf6' },
  PRET:          { label: 'Prêt',         color: '#06b6d4' },
  EN_ROUTE:      { label: 'En route',     color: '#f97316' },
  LIVRER:        { label: 'Livré',        color: '#10b981' },
  ANNULER:       { label: 'Annulé',       color: '#f43f5e' },
};

interface OrderStatsProps {
  data: DashboardOrderStats[];
}

export function OrderStats({ data }: OrderStatsProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-5 shadow-card">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Répartition des commandes</h3>

      {/* Donut-like bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-5">
        {data.map((d) => {
          const cfg = statusConfig[d.status];
          if (!cfg || d.count === 0) return null;
          const pct = (d.count / total) * 100;
          return (
            <div
              key={d.status}
              style={{ width: `${pct}%`, backgroundColor: cfg.color }}
              title={`${cfg.label}: ${d.count}`}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {data.map((d) => {
          const cfg = statusConfig[d.status];
          if (!cfg) return null;
          return (
            <div key={d.status} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-zinc-600 dark:text-zinc-400">{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{d.count}</span>
                <span className="text-zinc-400 text-xs w-8 text-right tabular-nums">{d.percentage.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
