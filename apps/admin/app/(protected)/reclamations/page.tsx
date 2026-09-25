'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClaims, type ClaimStateFilter } from '@lilia/api-client';
import { AlertCircle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ageLabel } from '@/lib/ops-links';
import { apiMessage } from '@/lib/api-message';
import {
  CLAIM_OUTCOME_LABELS,
  CLAIM_STATUS_LABELS,
  claimReasonLabel,
} from '@/lib/claim-labels';

const FILTERS: { value: ClaimStateFilter; label: string }[] = [
  { value: 'open', label: 'À traiter' },
  { value: 'closed', label: 'Traitées' },
  { value: 'all', label: 'Toutes' },
];

/**
 * Réclamations (F3-06). Le support voit toutes les demandes, la plus ancienne
 * d'abord ; le vendeur, celles de sa boutique. La portée vient du serveur.
 */
export default function ReclamationsPage() {
  const { token, user } = useAuthStore();
  const [state, setState] = useState<ClaimStateFilter>('open');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useClaims(token, { page, state });
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (data?.meta.limit || 20)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Réclamations</h1>
        <p className="text-sm text-zinc-500">
          {user?.role === 'ADMIN'
            ? 'Demandes des clients sur une commande livrée. Répondez dans les 2 h.'
            : 'Ce que vos clients signalent. Répondez au service client dans le fil.'}
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setState(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              state === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-zinc-100 text-zinc-600 dark:bg-dark-card dark:text-zinc-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} /> {apiMessage(error, 'Chargement impossible.')}
        </p>
      ) : !data?.data.length ? (
        <p className="text-sm text-zinc-500">Aucune réclamation.</p>
      ) : (
        <ul className="space-y-2">
          {data.data.map((c) => (
            <li key={c.id}>
              <Link
                href={`/reclamations/${c.id}`}
                className="block rounded-2xl border border-zinc-200 bg-white p-4 hover:border-primary-300 dark:border-dark-border dark:bg-dark-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      #{c.orderRef} — {claimReasonLabel(c.reason)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{c.summary}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px]">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-dark-border">
                      {c.outcome ? CLAIM_OUTCOME_LABELS[c.outcome] : CLAIM_STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-zinc-400">{ageLabel(c.createdAt)}</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <MessageSquare size={11} /> {c.messagesCount}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          {page} / {pages}
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
