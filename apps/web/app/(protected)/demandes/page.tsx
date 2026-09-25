'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useClaims } from '@lilia/api-client';
import { formatDateTime } from '@lilia/utils';

import { useAuthStore } from '@/store/auth';
import { claimReasonLabel, claimStatusLabel } from '@/lib/claims';

/** « Mes demandes » (F3-06) : les réclamations du client et leur issue. */
export default function DemandesPage() {
  const { token } = useAuthStore();
  const { data, isLoading, error } = useClaims(token, { scope: 'mine' });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profil" aria-label="Retour au profil">
          <ArrowLeft className="w-5 h-5 text-ink-700" />
        </Link>
        <h1 className="text-xl font-bold text-ink-900">Mes demandes</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-500">Chargement…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">
          {error instanceof Error ? error.message : 'Chargement impossible.'}
        </p>
      ) : !data?.data.length ? (
        <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-ink-300" />
          <p className="mt-3 text-sm text-ink-500">
            Aucune demande. Un souci avec une commande livrée ? Ouvrez-la depuis « Mes commandes ».
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.data.map((c) => (
            <li key={c.id}>
              <Link
                href={`/demandes/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-cream-200 p-4 hover:bg-cream-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    Commande #{c.orderRef} — {claimReasonLabel(c.reason)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {claimStatusLabel(c.status, c.outcome)} · {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
