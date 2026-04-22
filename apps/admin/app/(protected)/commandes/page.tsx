'use client';

import { useState } from 'react';
import { useRestaurantOrders, useUpdateOrderStatus } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, OrderStatus } from '@lilia/types';
import { RefreshCw, ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCsv } from '@/lib/export-csv';

const STATUS_LABELS: Record<OrderStatus, string> = {
  EN_ATTENTE:     'En attente',
  PAYER:          'Payé',
  EN_PREPARATION: 'En préparation',
  PRET:           'Prêt',
  EN_ROUTE:       'En route',
  LIVRER:         'Livré',
  ANNULER:        'Annulé',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  EN_ATTENTE:     'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  PAYER:          'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  EN_PREPARATION: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  PRET:           'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  EN_ROUTE:       'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  LIVRER:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  ANNULER:        'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  EN_ATTENTE:     'EN_PREPARATION',
  PAYER:          'EN_PREPARATION',
  EN_PREPARATION: 'PRET',
  PRET:           'EN_ROUTE',
  EN_ROUTE:       'LIVRER',
};

const ALL_STATUSES: OrderStatus[] = ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'PRET', 'EN_ROUTE', 'LIVRER', 'ANNULER'];

function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (id: string, status: OrderStatus) => void }) {
  const [open, setOpen] = useState(false);
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            #{order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {new Date(order.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <button onClick={() => setOpen((v) => !v)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-zinc-100 dark:border-dark-border pt-3">
        <div>
          <p className="text-xs text-zinc-500">{order.items.length} article{order.items.length > 1 ? 's' : ''}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {(order.total ?? 0).toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.status !== 'LIVRER' && order.status !== 'ANNULER' && (
            <button
              onClick={() => onStatusUpdate(order.id, 'ANNULER')}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Annuler
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
            >
              → {STATUS_LABELS[nextStatus]}
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-dark-border pt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.quantite}× {item.product?.nom ?? 'Produit'}
                {item.variantLabel ? ` (${item.variantLabel})` : ''}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">
                {(item.prix ?? 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          ))}
          {order.notes && (
            <p className="text-xs text-zinc-400 italic mt-2">Note: {order.notes}</p>
          )}
          {order.deliveryAddress && (
            <p className="text-xs text-zinc-500 mt-1">📍 {order.deliveryAddress}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommandesPage() {
  const { token } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');

  const { data: orders, isLoading, refetch, isFetching } = useRestaurantOrders(token);
  const { mutate: updateStatus } = useUpdateOrderStatus(token);

  function handleExport() {
    const rows = (orders ?? []).map((o: Order) => ({
      ID:         o.id.slice(-8).toUpperCase(),
      Date:       new Date(o.createdAt).toLocaleString('fr-FR'),
      Statut:     STATUS_LABELS[o.status] ?? o.status,
      Articles:   o.items.length,
      Total_FCFA: o.total ?? 0,
      Livraison:  o.isDelivery ? 'Oui' : 'Non',
      Adresse:    o.deliveryAddress ?? '',
    }));
    exportToCsv(`commandes_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  function handleStatusUpdate(orderId: string, status: OrderStatus) {
    updateStatus(
      { orderId, status },
      {
        onSuccess: () => toast.success(`Statut mis à jour: ${STATUS_LABELS[status]}`),
        onError: () => toast.error('Erreur lors de la mise à jour'),
      },
    );
  }

  const filtered = orders?.filter((o) =>
    filterStatus === 'ALL' ? true : o.status === filterStatus,
  ) ?? [];

  return (
    <div className="max-w-4xl space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Tout ({orders?.length ?? 0})
          </button>
          {(['EN_ATTENTE', 'EN_PREPARATION', 'PRET', 'EN_ROUTE'] as OrderStatus[]).map((s) => {
            const count = orders?.filter((o) => o.status === s).length ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={!orders?.length}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">Aucune commande{filterStatus !== 'ALL' ? ` en statut "${STATUS_LABELS[filterStatus as OrderStatus]}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
