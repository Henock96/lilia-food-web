'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useClaim, usePostClaimMessage } from '@lilia/api-client';
import { formatCurrency, formatDateTime } from '@lilia/utils';

import { useAuthStore } from '@/store/auth';
import { claimReasonLabel, claimStatusLabel } from '@/lib/claims';

/**
 * Une demande et son fil avec le service client (F3-06). Rafraîchi toutes
 * les 30 s : la réponse arrive sans recharger.
 */
export default function DemandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const { data: claim, isLoading, error } = useClaim(token, id);
  const post = usePostClaimMessage(token, id);
  const [body, setBody] = useState('');

  if (isLoading) {
    return <p className="max-w-2xl mx-auto px-4 py-8 text-sm text-ink-500">Chargement…</p>;
  }
  if (error || !claim) {
    return (
      <p className="max-w-2xl mx-auto px-4 py-8 text-sm text-rose-600">
        {error instanceof Error ? error.message : 'Demande introuvable.'}
      </p>
    );
  }

  async function send() {
    const text = body.trim();
    if (!text) return;
    try {
      await post.mutateAsync({ body: text });
      setBody('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Message non envoyé.');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/demandes" aria-label="Retour à mes demandes">
          <ArrowLeft className="w-5 h-5 text-ink-700" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-ink-900">
            {claimReasonLabel(claim.reason)} — commande #{claim.orderRef}
          </h1>
          <p className="text-xs text-ink-500">
            {claim.order.restaurant.nom} · {claimStatusLabel(claim.status, claim.outcome)}
          </p>
        </div>
      </div>

      {claim.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-200 p-4 mb-4 text-sm">
          <p className="font-medium text-ink-700 mb-1">Articles concernés</p>
          <ul className="list-disc pl-5 text-ink-600">
            {claim.items.map((i) => (
              <li key={i.orderItemId}>
                {i.quantity} × {i.label}
              </li>
            ))}
          </ul>
          {claim.photoUrls.length > 0 && (
            <div className="mt-3 flex gap-2">
              {claim.photoUrls.map((url) => (
                <Image
                  key={url}
                  src={url}
                  alt="Photo jointe"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* L'issue, en tête : c'est ce que le client vient chercher. */}
      {claim.refunds
        .filter((r) => r.fromThisClaim)
        .map((r) => (
          <div key={r.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 text-sm text-emerald-800">
            {r.status === 'COMPLETED'
              ? `${formatCurrency(r.amountXaf)} vous ont été remboursés sur votre Mobile Money.`
              : r.status === 'REJECTED'
                ? 'Le remboursement n’a pas pu aboutir : le service client vous recontacte.'
                : `${formatCurrency(r.amountXaf)} sont en cours de remboursement sur votre Mobile Money.`}
          </div>
        ))}
      {claim.voucher && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-900">
          <p>
            Avoir de {formatCurrency(claim.voucher.amountXaf)}, valable jusqu’au{' '}
            {new Date(claim.voucher.expiresAt).toLocaleDateString('fr-FR')} :
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(claim.voucher!.code);
              toast.success('Code copié.');
            }}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 font-mono font-semibold"
          >
            {claim.voucher.code} <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-3 mb-4">
        {claim.messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              m.mine ? 'self-end bg-tomato-50 text-ink-900' : 'self-start bg-white border border-cream-200'
            }`}
          >
            <p className="text-[11px] text-ink-500 mb-1">
              {m.authorLabel} · {formatDateTime(m.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>

      {claim.status !== 'CLOSED' && (
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Écrire au service client…"
            className="flex-1 rounded-xl border border-cream-300 p-3 text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={!body.trim() || post.isPending}
            aria-label="Envoyer"
            className="rounded-xl bg-tomato-600 px-4 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
