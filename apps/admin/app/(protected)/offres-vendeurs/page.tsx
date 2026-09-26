'use client';

import { useState } from 'react';
import { useAdminVendorOffers, useStopVendorOffer } from '@lilia/api-client';
import type { AdminVendorOffer, VendorOfferStatus } from '@lilia/types';
import { toast } from 'sonner';
import { BadgePercent, OctagonX, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * F3-11 — offres boutique financées par les vendeurs.
 *
 * L'administration ne les crée pas (c'est le vendeur, depuis son app) : elle
 * les voit, avec ce qu'elles ont coûté, et peut en arrêter une d'urgence
 * (motif obligatoire, communiqué au vendeur, tracé au journal d'audit).
 */

const STATUS_LABELS: Record<VendorOfferStatus, string> = {
  ACTIVE: 'En cours',
  PAUSED: 'En pause',
  EXHAUSTED: 'Budget épuisé',
  ENDED: 'Terminée',
  STOPPED_BY_ADMIN: 'Arrêtée',
};

const STATUS_STYLES: Record<VendorOfferStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  EXHAUSTED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  ENDED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  STOPPED_BY_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const FILTERS: (VendorOfferStatus | null)[] = [null, 'ACTIVE', 'PAUSED', 'EXHAUSTED', 'ENDED', 'STOPPED_BY_ADMIN'];

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const date = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));

function StopModal({
  offer,
  onClose,
}: {
  offer: AdminVendorOffer;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const stop = useStopVendorOffer(token);
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    stop.mutate(
      { id: offer.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Offre arrêtée. Le vendeur a été prévenu.');
          onClose();
        },
        onError: (err) => toast.error((err as { message?: string }).message || 'Arrêt impossible'),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative bg-white dark:bg-dark-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Arrêter l’offre de {offer.restaurant.nom}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            « {offer.label} » cessera de s’appliquer aux nouvelles commandes. Les commandes déjà
            passées gardent leur remise. Le motif est communiqué au vendeur.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Motif (5 caractères au moins)"
            className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-dark-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!valid || stop.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            Arrêter l’offre
          </button>
        </div>
      </form>
    </div>
  );
}

export default function VendorOffersPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<VendorOfferStatus | null>('ACTIVE');
  const [page, setPage] = useState(1);
  const [stopping, setStopping] = useState<AdminVendorOffer | null>(null);
  const { data, isLoading, isError, error } = useAdminVendorOffers(token, status, page);
  const offers = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <BadgePercent className="text-primary-600" size={22} />
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Offres vendeurs</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-5">
        Promotions publiées et financées par les vendeurs, retenues sur leurs versements. La commission
        Lilia reste calculée sur le prix avant remise.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f ?? 'all'}
            onClick={() => {
              setStatus(f);
              setPage(1);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              status === f
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            {f ? STATUS_LABELS[f] : 'Toutes'}
          </button>
        ))}
      </div>

      {isError ? (
        <p className="text-sm text-red-600">{(error as { message?: string })?.message ?? 'Chargement impossible'}</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Aucune offre dans cette catégorie.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 border-b border-zinc-100 dark:border-dark-border">
              <tr>
                <th className="text-left font-medium px-4 py-3">Vendeur</th>
                <th className="text-left font-medium px-4 py-3">Offre</th>
                <th className="text-left font-medium px-4 py-3">Budget consommé</th>
                <th className="text-left font-medium px-4 py-3">Commandes</th>
                <th className="text-left font-medium px-4 py-3">Période</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const pct = o.budgetXaf > 0 ? Math.min(100, Math.round((o.spentXaf / o.budgetXaf) * 100)) : 0;
                const stoppable = o.status === 'ACTIVE' || o.status === 'PAUSED';
                return (
                  <tr key={o.id} className="border-b last:border-0 border-zinc-100 dark:border-dark-border">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{o.restaurant.nom}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {o.label}
                      {o.stoppedReason && (
                        <span className="block text-xs text-red-600">Motif : {o.stoppedReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">
                        {fcfa(o.spentXaf)} / {fcfa(o.budgetXaf)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{o.ordersCount}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {date(o.startsAt)} → {date(o.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {stoppable && (
                        <button
                          onClick={() => setStopping(o)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <OctagonX size={14} /> Arrêter
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-zinc-500">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}

      {stopping && <StopModal offer={stopping} onClose={() => setStopping(null)} />}
    </div>
  );
}
