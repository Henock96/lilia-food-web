'use client';

import { useState } from 'react';
import { useRestaurantOrders, useUpdateOrderStatus } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order, OrderStatus } from '@lilia/types';
import Link from 'next/link';
import { RefreshCw, ChevronDown, Download, AlertCircle, ArrowRight, CalendarClock } from 'lucide-react';
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

// State machine backend : EN_ATTENTE → PAYER → EN_PREPARATION → PRET → EN_ROUTE → LIVRER.
// La transition `EN_ATTENTE → PAYER` est réservée à ADMIN (confirmation manuelle du
// virement MoMo/Airtel) — on l'affiche, mais on guarde via `canAdvanceStatus` plus bas
// pour ne pas la proposer à un RESTAURATEUR.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  EN_ATTENTE:     'PAYER',
  PAYER:          'EN_PREPARATION',
  EN_PREPARATION: 'PRET',
  PRET:           'EN_ROUTE',
  EN_ROUTE:       'LIVRER',
};

/**
 * RESTAURATEUR ne doit jamais déclencher `EN_ATTENTE → PAYER` (réservé à ADMIN).
 * On masque le bouton côté UI ; le backend refuserait de toute façon.
 */
function canAdvanceStatus(currentStatus: OrderStatus, role: string | undefined): boolean {
  if (currentStatus !== 'EN_ATTENTE') return true;
  return role === 'ADMIN';
}

const ALL_STATUSES: OrderStatus[] = ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'PRET', 'EN_ROUTE', 'LIVRER', 'ANNULER'];

// LIL-123 : Brazzaville n'a pas de DST, mais on passe toujours par Intl pour rester
// portable si on déménage l'admin sur un fuseau différent. `en-CA` produit le
// format YYYY-MM-DD qui est trivialement comparable en string.
const BRAZZA_TZ = 'Africa/Brazzaville';

function brazzavilleDateString(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-CA', { timeZone: BRAZZA_TZ });
}

function formatScheduledShort(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { timeZone: BRAZZA_TZ, day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('fr-FR', { timeZone: BRAZZA_TZ, hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

function formatScheduledFull(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', {
    timeZone: BRAZZA_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('fr-FR', { timeZone: BRAZZA_TZ, hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

function OrderCard({
  order,
  role,
  onStatusUpdate,
}: {
  order: Order;
  role: string | undefined;
  onStatusUpdate: (id: string, status: OrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const nextStatus = NEXT_STATUS[order.status];
  const canAdvance = canAdvanceStatus(order.status, role);
  const waitingForPayment = order.status === 'EN_ATTENTE' && !canAdvance;

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
          {order.isPreorder && order.scheduledFor && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 inline-flex items-center gap-1"
              title={`Programmée pour ${formatScheduledFull(order.scheduledFor)}`}
            >
              <CalendarClock size={12} />
              {formatScheduledShort(order.scheduledFor)}
            </span>
          )}
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
          {nextStatus && canAdvance && (
            <button
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
            >
              → {STATUS_LABELS[nextStatus]}
            </button>
          )}
        </div>
      </div>

      {/* Bannière paiement en attente — affichée au RESTAURATEUR qui ne peut pas
          confirmer le paiement lui-même. Renvoie vers l'écran "Paiements". */}
      {waitingForPayment && (
        <Link
          href="/paiements"
          className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors group"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span className="text-xs font-medium">
            Paiement non confirmé — un admin doit valider le virement
          </span>
          <ArrowRight size={12} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}

      {/* Details */}
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-dark-border pt-3 space-y-2">
          {order.isPreorder && order.scheduledFor && (
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 mb-2">
              <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                Programmée pour
              </p>
              <p className="text-sm text-orange-900 dark:text-orange-200 mt-0.5 capitalize">
                {formatScheduledFull(order.scheduledFor)}
              </p>
            </div>
          )}
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
  const { token, user } = useAuthStore();
  const role = user?.role;
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [todayOnly, setTodayOnly] = useState(false);

  const { data: orders, isLoading, refetch, isFetching } = useRestaurantOrders(token);
  const { mutate: updateStatus } = useUpdateOrderStatus(token);

  // LIL-123 : Pré-commandes programmées pour aujourd'hui (timezone Brazzaville).
  // On exclut ANNULER d'office — le restaurateur n'a plus à les préparer.
  const todayBzv = brazzavilleDateString(new Date());
  const todayPreorderCount = orders?.filter(
    (o) => o.isPreorder && o.scheduledFor && o.status !== 'ANNULER' && brazzavilleDateString(o.scheduledFor) === todayBzv,
  ).length ?? 0;

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

  let filtered = orders?.filter((o) =>
    filterStatus === 'ALL' ? true : o.status === filterStatus,
  ) ?? [];

  if (todayOnly) {
    filtered = filtered.filter(
      (o) =>
        o.isPreorder &&
        o.scheduledFor &&
        o.status !== 'ANNULER' &&
        brazzavilleDateString(o.scheduledFor) === todayBzv,
    );
    // Quand on filtre "Aujourd'hui", on trie par heure de retrait ascendante
    // pour que le restaurateur voie ce qui arrive en premier.
    filtered = [...filtered].sort((a, b) => {
      const ta = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
      const tb = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
      return ta - tb;
    });
  }

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
          {todayPreorderCount > 0 && (
            <button
              onClick={() => setTodayOnly((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
                todayOnly
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/15'
              }`}
              title="Pré-commandes programmées pour aujourd'hui"
            >
              <CalendarClock size={12} />
              Aujourd&apos;hui ({todayPreorderCount})
            </button>
          )}
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
          <p className="text-zinc-400 text-sm">
            Aucune commande
            {todayOnly ? ' programmée pour aujourd\'hui' : ''}
            {filterStatus !== 'ALL' && !todayOnly ? ` en statut "${STATUS_LABELS[filterStatus as OrderStatus]}"` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} role={role} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
