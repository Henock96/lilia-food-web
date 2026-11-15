'use client';

import { useState } from 'react';
import {
  useAdminDeliveryReviews,
  useAdminReviews,
  useModerateReview,
  type ModerationTarget,
  type ReviewModerationFilters,
} from '@lilia/api-client';
import type { ReviewVisibilityFilter } from '@lilia/types';
import { toast } from 'sonner';
import { Eye, EyeOff, Star, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lot B (15/11/2026) — modération des avis.
 *
 * On **masque**, on ne supprime pas : un avis masqué sort de la fiche publique
 * et des moyennes, reste en base, se rétablit d'un clic, et chaque geste est
 * tracé au journal d'audit avec son motif. La réponse d'un vendeur se masque
 * à part, sans toucher à l'avis.
 */

type Tab = 'reviews' | 'delivery';

const VISIBILITY: { value: ReviewVisibilityFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'visible', label: 'Visibles' },
  { value: 'hidden', label: 'Masqués' },
];

const date = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-300 dark:text-zinc-600'}
        />
      ))}
    </span>
  );
}

interface HideRequest {
  target: ModerationTarget;
  id: string;
  title: string;
}

function HideModal({ request, onClose }: { request: HideRequest; onClose: () => void }) {
  const { token } = useAuthStore();
  const moderate = useModerateReview(token);
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    moderate.mutate(
      { target: request.target, id: request.id, action: 'hide', reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Masqué. Le geste est inscrit au journal.');
          onClose();
        },
        onError: (err) => toast.error((err as { message?: string }).message || 'Masquage impossible'),
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
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{request.title}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Le contenu disparaît de la fiche publique et ne compte plus dans la note. Il reste en base et
            peut être rétabli.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
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
            disabled={!valid || moderate.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            Masquer
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionButton({
  hidden,
  onHide,
  target,
  id,
  hideLabel = 'Masquer',
}: {
  hidden: boolean;
  onHide: () => void;
  target: ModerationTarget;
  id: string;
  hideLabel?: string;
}) {
  const { token } = useAuthStore();
  const moderate = useModerateReview(token);
  if (!hidden) {
    return (
      <button onClick={onHide} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
        <EyeOff size={14} /> {hideLabel}
      </button>
    );
  }
  return (
    <button
      disabled={moderate.isPending}
      onClick={() =>
        moderate.mutate(
          { target, id, action: 'unhide' },
          {
            onSuccess: () => toast.success('Rétabli.'),
            onError: (err) => toast.error((err as { message?: string }).message || 'Rétablissement impossible'),
          },
        )
      }
      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
    >
      <Eye size={14} /> Rétablir
    </button>
  );
}

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
      >
        Précédent
      </button>
      <span className="text-zinc-500">
        {page} / {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
      >
        Suivant
      </button>
    </div>
  );
}

function ListState({
  isError,
  error,
  isLoading,
  empty,
}: {
  isError: boolean;
  error: unknown;
  isLoading: boolean;
  empty: boolean;
}) {
  if (isError) {
    return <p className="text-sm text-red-600">{(error as { message?: string })?.message ?? 'Chargement impossible'}</p>;
  }
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (empty) return <p className="text-sm text-zinc-500 py-10 text-center">Aucun avis dans cette sélection.</p>;
  return null;
}

function VendorReviews({
  filters,
  onHide,
}: {
  filters: ReviewModerationFilters;
  onHide: (r: HideRequest) => void;
}) {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useAdminReviews(token, filters, page);
  const rows = data?.data ?? [];
  if (isError || isLoading || rows.length === 0) {
    return <ListState isError={isError} error={error} isLoading={isLoading} empty={rows.length === 0} />;
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border p-4 bg-white dark:bg-dark-card ${
              r.hiddenAt ? 'border-red-200 dark:border-red-500/30 opacity-80' : 'border-zinc-200 dark:border-dark-border'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars rating={r.rating} />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.restaurant?.nom ?? '—'}</span>
                <span className="text-xs text-zinc-500">
                  par {r.user?.nom ?? 'Client'} · {date(r.createdAt)}
                  {r.orderId ? ` · commande #${r.orderId.slice(-6).toUpperCase()}` : ' · avis général'}
                </span>
              </div>
              <ActionButton
                hidden={!!r.hiddenAt}
                target="REVIEW"
                id={r.id}
                onHide={() =>
                  onHide({ target: 'REVIEW', id: r.id, title: `Masquer l’avis sur ${r.restaurant?.nom ?? 'la boutique'}` })
                }
              />
            </div>
            {r.comment && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{r.comment}</p>}
            {r.hiddenAt && (
              <p className="mt-1 text-xs text-red-600">
                Masqué le {date(r.hiddenAt)} : {r.hiddenReason}
              </p>
            )}
            {r.vendorReply && (
              <div className="mt-3 ml-4 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Réponse de la boutique{r.vendorReplyHiddenAt ? ' (masquée)' : ''}
                  </p>
                  <ActionButton
                    hidden={!!r.vendorReplyHiddenAt}
                    target="VENDOR_REPLY"
                    id={r.id}
                    hideLabel="Masquer la réponse"
                    onHide={() =>
                      onHide({
                        target: 'VENDOR_REPLY',
                        id: r.id,
                        title: `Masquer la réponse de ${r.restaurant?.nom ?? 'la boutique'}`,
                      })
                    }
                  />
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">{r.vendorReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pager page={page} pages={data?.meta.totalPages ?? 1} onChange={setPage} />
    </>
  );
}

function DriverReviews({
  filters,
  onHide,
}: {
  filters: ReviewModerationFilters;
  onHide: (r: HideRequest) => void;
}) {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useAdminDeliveryReviews(token, filters, page);
  const rows = data?.data ?? [];
  if (isError || isLoading || rows.length === 0) {
    return <ListState isError={isError} error={error} isLoading={isLoading} empty={rows.length === 0} />;
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border p-4 bg-white dark:bg-dark-card ${
              r.hiddenAt ? 'border-red-200 dark:border-red-500/30 opacity-80' : 'border-zinc-200 dark:border-dark-border'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars rating={r.rating} />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.deliverer?.nom ?? 'Livreur'}</span>
                <span className="text-xs text-zinc-500">
                  par {r.user?.nom ?? 'Client'} · {date(r.createdAt)} · commande #{r.orderId.slice(-6).toUpperCase()}
                </span>
              </div>
              <ActionButton
                hidden={!!r.hiddenAt}
                target="DELIVERY_REVIEW"
                id={r.id}
                onHide={() =>
                  onHide({
                    target: 'DELIVERY_REVIEW',
                    id: r.id,
                    title: `Masquer la note de ${r.deliverer?.nom ?? 'ce livreur'}`,
                  })
                }
              />
            </div>
            {r.comment && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{r.comment}</p>}
            {r.hiddenAt && (
              <p className="mt-1 text-xs text-red-600">
                Masquée le {date(r.hiddenAt)} : {r.hiddenReason}
              </p>
            )}
          </li>
        ))}
      </ul>
      <Pager page={page} pages={data?.meta.totalPages ?? 1} onChange={setPage} />
    </>
  );
}

export default function ReviewsModerationPage() {
  const [tab, setTab] = useState<Tab>('reviews');
  const [visibility, setVisibility] = useState<ReviewVisibilityFilter>('all');
  const [rating, setRating] = useState<number | null>(null);
  const [hiding, setHiding] = useState<HideRequest | null>(null);
  const filters: ReviewModerationFilters = { visibility, rating };
  // La clé remet la pagination à 1 quand un filtre change.
  const listKey = `${tab}-${visibility}-${rating ?? 'all'}`;

  const chip = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Star className="text-primary-600" size={22} />
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Avis</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-5">
        Avis laissés sur les boutiques et notes des livreurs. Masquer retire un contenu de la fiche publique et de la
        note, sans le supprimer.
      </p>

      <div className="flex gap-2 mb-3">
        <button className={chip(tab === 'reviews')} onClick={() => setTab('reviews')}>
          Boutiques
        </button>
        <button className={chip(tab === 'delivery')} onClick={() => setTab('delivery')}>
          Livreurs
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {VISIBILITY.map((v) => (
          <button key={v.value} className={chip(visibility === v.value)} onClick={() => setVisibility(v.value)}>
            {v.label}
          </button>
        ))}
        <span className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {[null, 1, 2, 3, 4, 5].map((n) => (
          <button key={n ?? 'all'} className={chip(rating === n)} onClick={() => setRating(n)}>
            {n ? `${n} ★` : 'Toutes notes'}
          </button>
        ))}
      </div>

      {tab === 'reviews' ? (
        <VendorReviews key={listKey} filters={filters} onHide={setHiding} />
      ) : (
        <DriverReviews key={listKey} filters={filters} onHide={setHiding} />
      )}

      {hiding && <HideModal request={hiding} onClose={() => setHiding(null)} />}
    </div>
  );
}
