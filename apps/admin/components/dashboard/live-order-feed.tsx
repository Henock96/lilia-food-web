'use client';

import { useRestaurantOrders } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import type { Order } from '@lilia/types';

const STATUS_STYLES: Record<string, string> = {
  EN_ATTENTE:     'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  PAYER:          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  EN_PREPARATION: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  PRET:           'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
  EN_ROUTE:       'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  LIVRER:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  ANNULER:        'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE:     'En attente',
  PAYER:          'Payé',
  EN_PREPARATION: 'En préparation',
  PRET:           'Prêt',
  EN_ROUTE:       'En route',
  LIVRER:         'Livré',
  ANNULER:        'Annulé',
};

export function LiveOrderFeed() {
  const { token } = useAuthStore();
  const { data: orders } = useRestaurantOrders(token);

  const recent = [...(orders ?? [])]
    .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Commandes récentes</h3>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-dark-border">
        {recent.map((o: Order) => {
          const time = new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const style = STATUS_STYLES[o.status];
          const label = STATUS_LABELS[o.status] ?? o.status;
          return (
            <div key={o.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-xs text-zinc-400 w-10 tabular-nums shrink-0">{time}</span>
              <span className="flex-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                #{o.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
                {(o.total ?? 0).toLocaleString('fr-FR')} FCFA
              </span>
              {style && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${style}`}>{label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
