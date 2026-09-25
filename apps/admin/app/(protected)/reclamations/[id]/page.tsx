'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  useClaim,
  useIssueVoucher,
  usePostClaimMessage,
  useRejectClaim,
} from '@lilia/api-client';
import type { ClaimDetail, MessageVisibility } from '@lilia/types';
import { AlertCircle, ArrowLeft, Phone, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { RefundComposer } from '@/components/refunds/refund-composer';
import { apiMessage } from '@/lib/api-message';
import { refundReasonForClaim } from '@/lib/refund-composer';
import {
  CLAIM_OUTCOME_LABELS,
  CLAIM_STATUS_LABELS,
  claimReasonLabel,
} from '@/lib/claim-labels';

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Fiche d'une réclamation (F3-06) : le fil, et pour le support les trois
 * issues — rembourser (composeur), offrir un avoir, refuser. Chacune clôt la
 * réclamation et prévient le client dans le fil.
 */
export default function ReclamationPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuthStore();
  const { data: claim, isLoading, error } = useClaim(token, id);
  const isAdmin = user?.role === 'ADMIN';

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !claim) {
    return (
      <p className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle size={16} /> {apiMessage(error, 'Réclamation introuvable.')}
      </p>
    );
  }
  const open = claim.status === 'OPEN' || claim.status === 'IN_PROGRESS';

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/reclamations" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft size={14} /> Réclamations
      </Link>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-dark-border dark:bg-dark-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">
              #{claim.orderRef} — {claimReasonLabel(claim.reason)}
            </h1>
            <p className="text-sm text-zinc-500">
              {claim.order.restaurant.nom} · commande de {fmt(claim.order.total)} · ouverte le{' '}
              {when(claim.createdAt)}
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-dark-border">
            {claim.outcome ? CLAIM_OUTCOME_LABELS[claim.outcome] : CLAIM_STATUS_LABELS[claim.status]}
          </span>
        </div>

        {claim.customer && (
          <p className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-medium">{claim.customer.nom ?? 'Client'}</span>
            {claim.customer.phone && (
              <a href={`tel:${claim.customer.phone}`} className="inline-flex items-center gap-1 text-primary-600">
                <Phone size={12} /> {claim.customer.phone}
              </a>
            )}
          </p>
        )}
        {claim.abuse && (
          <p
            className={`mt-2 flex items-center gap-2 text-xs ${
              claim.abuse.manualReviewRequired ? 'text-red-600' : 'text-zinc-500'
            }`}
          >
            <ShieldAlert size={13} />
            {claim.abuse.claims30d} réclamation(s) sur 30 jours, dont {claim.abuse.accepted30d} acceptée(s)
            {claim.abuse.manualReviewRequired ? ' — revue manuelle obligatoire.' : '.'}
          </p>
        )}

        {claim.items.length > 0 && (
          <ul className="mt-3 text-sm list-disc pl-5">
            {claim.items.map((i) => (
              <li key={i.orderItemId}>
                {i.quantity} × {i.label}
              </li>
            ))}
          </ul>
        )}
        {claim.photoUrls.length > 0 && (
          <div className="mt-3 flex gap-2">
            {claim.photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <Image src={url} alt="Photo jointe" width={96} height={96} className="rounded-lg object-cover h-24 w-24" />
              </a>
            ))}
          </div>
        )}
        {claim.resolution && (
          <p className="mt-3 text-sm">
            <span className="text-zinc-400">Issue : </span>
            {claim.resolution}
          </p>
        )}
        {!!claim.vendorImpactXaf && (
          <p className="mt-2 text-sm text-amber-600">
            {fmt(claim.vendorImpactXaf)} à la charge du vendeur (retenus sur son reversement).
          </p>
        )}
      </div>

      <Thread claim={claim} token={token} isAdmin={isAdmin} />

      {isAdmin && open && <Decisions claim={claim} token={token} />}
    </div>
  );
}

function Thread({
  claim,
  token,
  isAdmin,
}: {
  claim: ClaimDetail;
  token: string | null;
  isAdmin: boolean;
}) {
  const post = usePostClaimMessage(token, claim.id);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<MessageVisibility>('ALL');

  function send() {
    if (!body.trim()) return;
    post.mutate(
      { body: body.trim(), ...(isAdmin ? { visibility } : {}) },
      {
        onSuccess: () => setBody(''),
        onError: (e) => toast.error(apiMessage(e, 'Message non envoyé.')),
      },
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-dark-border dark:bg-dark-card space-y-3">
      <h2 className="font-semibold text-sm">Échanges</h2>
      <ul className="space-y-2">
        {claim.messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl p-3 text-sm ${
              m.visibility === 'STAFF_ONLY'
                ? 'bg-amber-50 dark:bg-amber-500/10'
                : m.authorRole === 'CLIENT'
                  ? 'bg-zinc-50 dark:bg-dark-border'
                  : 'bg-primary-50 dark:bg-primary-500/10'
            }`}
          >
            <p className="text-[11px] text-zinc-500">
              {m.authorLabel} · {when(m.createdAt)}
              {m.visibility === 'STAFF_ONLY' ? ' · non visible du client' : ''}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>
      {claim.status !== 'CLOSED' && (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={isAdmin ? 'Répondre…' : 'Votre version, pour le service client…'}
            className="w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm dark:border-dark-border"
          />
          <div className="flex items-center justify-between gap-2">
            {isAdmin ? (
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as MessageVisibility)}
                className="rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-dark-border"
              >
                <option value="ALL">Visible du client</option>
                <option value="STAFF_ONLY">Support et vendeur seulement</option>
              </select>
            ) : (
              <span className="text-xs text-zinc-500">Visible du service client uniquement.</span>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!body.trim() || post.isPending}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Decisions({ claim, token }: { claim: ClaimDetail; token: string | null }) {
  const voucher = useIssueVoucher(token, claim.id);
  const reject = useRejectClaim(token, claim.id);
  const [voucherXaf, setVoucherXaf] = useState(1000);
  const [rejectReason, setRejectReason] = useState('');
  const refundable = claim.order.status === 'LIVRER' || claim.order.status === 'ECHEC_LIVRAISON';

  return (
    <div className="space-y-3">
      {refundable && (
        <RefundComposer
          orderId={claim.orderId}
          token={token}
          incidentId={claim.id}
          defaultReason={refundReasonForClaim(claim.reason)}
          preselected={claim.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity }))}
        />
      )}

      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-dark-border space-y-2">
        <p className="font-semibold">Offrir un avoir</p>
        <p className="text-xs text-zinc-500">
          Code promo à usage unique, réservé à ce client, valable 30 jours. Utile quand le montant ne
          justifie pas un virement.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={100}
            step={100}
            value={voucherXaf}
            onChange={(e) => setVoucherXaf(Math.floor(Number(e.target.value) || 0))}
            className="w-28 rounded border border-zinc-200 bg-transparent px-2 py-1 dark:border-dark-border"
          />
          <button
            type="button"
            disabled={voucherXaf < 100 || voucher.isPending}
            onClick={() => {
              if (!window.confirm(`Offrir un avoir de ${fmt(voucherXaf)} et clore la réclamation ?`)) return;
              voucher.mutate(
                { amountXaf: voucherXaf },
                {
                  onSuccess: (v) => toast.success(`Avoir ${v.code} envoyé au client.`),
                  onError: (e) => toast.error(apiMessage(e, 'Avoir impossible.')),
                },
              );
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Offrir {fmt(voucherXaf)}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-dark-border space-y-2">
        <p className="font-semibold">Refuser</p>
        <input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          placeholder="Motif communiqué au client"
          className="w-full rounded border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-dark-border"
        />
        <button
          type="button"
          disabled={rejectReason.trim().length < 3 || reject.isPending}
          onClick={() => {
            if (!window.confirm('Refuser cette réclamation ? Le motif sera envoyé au client.')) return;
            reject.mutate(rejectReason.trim(), {
              onSuccess: () => toast.success('Réclamation refusée.'),
              onError: (e) => toast.error(apiMessage(e, 'Refus impossible.')),
            });
          }}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
        >
          Refuser la réclamation
        </button>
      </div>
    </div>
  );
}
