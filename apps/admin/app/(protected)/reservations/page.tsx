'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MAX_PAGE_SIZE, useAdminReservations, useAdminVendors } from '@lilia/api-client';
import type { ReservationStatus } from '@lilia/types';
import { CalendarClock, ChevronLeft, ChevronRight, Store, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatXaf,
  RESERVATION_STATUS_FILTERS,
  RESERVATION_STATUS_LABELS,
  reservationStatusTone,
  shortRef,
  TONE_STYLES,
} from '@/lib/reservations-view';

const formatArrival = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Brazzaville',
  });

/**
 * D-6 — réservations sur place, vues du support.
 *
 * Écran de **recherche** : on retrouve une réservation par restaurant, jour et
 * statut. Le seul geste (annuler) vit sur le détail, avec son contexte et un
 * motif obligatoire. `?restaurantId=` arrive depuis la fiche restaurant.
 */
export default function ReservationsPage() {
  return (
    <Suspense fallback={null}>
      <ReservationsList />
    </Suspense>
  );
}

function ReservationsList() {
  const { token } = useAuthStore();
  // Le restaurant vit dans l'URL : un lien `?restaurantId=` (fiche restaurant,
  // détail) change le filtre même quand la page est déjà ouverte.
  const router = useRouter();
  const restaurantId = useSearchParams().get('restaurantId') ?? '';
  const setRestaurantId = (v: string) =>
    router.replace(v ? `/reservations?restaurantId=${encodeURIComponent(v)}` : '/reservations');
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const vendors = useAdminVendors(token, { vendorType: 'RESTAURANT', limit: MAX_PAGE_SIZE });
  const { data, isLoading, isError, isPlaceholderData } = useAdminReservations(token, {
    restaurantId,
    status,
    date,
    page,
  });

  const total = data?.meta.total ?? 0;
  const limit = data?.meta.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Réservations</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tables réservées sur place. Les absences et la part due aux restaurants sont dans
          Paiements › Absences.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Restaurant"
          value={restaurantId}
          onChange={(e) => { setRestaurantId(e.target.value); setPage(1); }}
          className="text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-700 dark:text-zinc-200 max-w-full"
        >
          <option value="">Tous les restaurants</option>
          {vendors.data?.data.map((v) => (
            <option key={v.id} value={v.id}>{v.nom}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Jour d’arrivée"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-700 dark:text-zinc-200"
        />
        {date && (
          <button
            onClick={() => { setDate(''); setPage(1); }}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Tous les jours
          </button>
        )}
      </div>
      {vendors.isError && (
        <p className="text-xs text-red-500">
          Liste des restaurants indisponible : le filtre par restaurant ne peut pas être proposé.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {RESERVATION_STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'ALL'}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              status === f.value
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les réservations.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <CalendarClock size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucune réservation pour ces filtres.</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{shortRef(r.id)}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TONE_STYLES[reservationStatusTone(r.status)]}`}>
                      {RESERVATION_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5 flex items-center gap-1.5">
                    <Store size={12} className="text-zinc-400 shrink-0" />
                    {r.restaurant.nom}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarClock size={10} />
                      {formatArrival(r.arrivalAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {r.partySize} pers. · {r.spaceLabel}
                    </span>
                    <span>{r.customer.nom ?? 'Client'} · {r.customer.maskedPhone}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {r.total !== null ? (
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatXaf(r.total)} <span className="text-xs font-normal text-zinc-400">FCFA</span>
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400">non acceptée</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {data && total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {total} réservation{total > 1 ? 's' : ''} &middot; page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Page précédente"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                aria-label="Page suivante"
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
