'use client';

import { useState } from 'react';
import {
  useReferralRewards,
  useReviewReferralReward,
  usePublicPlatformSettings,
  pointsToXaf,
} from '@lilia/api-client';
import type { ReferralReward, ReferralRewardStatus } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, ShieldAlert, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * File d'arbitrage des récompenses de parrainage.
 *
 * ## Pourquoi cette page existe
 *
 * Une commande livrée ne prouve pas qu'un parrainage est légitime. Le scoring
 * anti-abus (`ReferralRiskService`) retient les cas douteux **sans les
 * refuser** : la commande reste valide, livrée et facturée ; seul le point du
 * parrain attend une décision humaine.
 *
 * Sans cette page, ces récompenses resteraient indéfiniment en attente — et un
 * parrain légitime pris dans un faux positif ne serait jamais payé.
 *
 * ## Ce qui est montré, et pourquoi
 *
 * Le **score** et le **détail des signaux**, figés au moment de la décision.
 * Un administrateur ne peut pas arbitrer sans savoir ce qui a été reproché :
 * « deux comptes sur la même installation » et « numéro déjà porté par trois
 * comptes » n'appellent pas la même conduite.
 */

const STATUS_TABS: { key: ReferralRewardStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'À arbitrer' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'REJECTED', label: 'Refusées' },
  { key: 'ALL', label: 'Toutes' },
];

const STATUS_STYLES: Record<ReferralRewardStatus, { label: string; tone: string }> = {
  APPROVED: {
    label: 'Approuvée',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  PENDING_REVIEW: {
    label: 'En attente',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  REJECTED: {
    label: 'Refusée',
    tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  },
};

/** Couleur du score : les bandes du scoring, pas un dégradé arbitraire. */
function scoreTone(score: number): string {
  if (score >= 81) return 'text-red-600 dark:text-red-400';
  if (score >= 61) return 'text-amber-600 dark:text-amber-400';
  if (score >= 31) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-emerald-600 dark:text-emerald-400';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ParrainagesPage() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<ReferralRewardStatus | 'ALL'>('PENDING_REVIEW');

  const { data, isLoading, isError } = useReferralRewards(token, status);
  const { data: pricing } = usePublicPlatformSettings();

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <AlertCircle size={16} />
        Cette page est réservée aux administrateurs.
      </div>
    );
  }

  const rewards = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Gift size={18} className="text-primary-500" />
          Récompenses de parrainage
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Une récompense retenue n&apos;annule jamais la commande du filleul : elle
          reste livrée et facturée. Seul le point du parrain attend votre décision.
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              status === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-64 rounded-xl" />}
      {isError && (
        <p className="text-xs text-red-500">
          Impossible de charger les récompenses de parrainage.
        </p>
      )}

      {!isLoading && !isError && rewards.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-dark-border p-8 text-center">
          <p className="text-sm text-zinc-500">
            {status === 'PENDING_REVIEW'
              ? 'Aucune récompense en attente d’arbitrage.'
              : 'Aucune récompense dans cette catégorie.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            token={token}
            pointValueLabel={
              reward.points > 0
                ? `${pointsToXaf(reward.points, pricing).toLocaleString('fr-FR')} FCFA`
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}

function RewardCard({
  reward,
  token,
  pointValueLabel,
}: {
  reward: ReferralReward;
  token: string | null;
  pointValueLabel: string | null;
}) {
  const [note, setNote] = useState('');
  const review = useReviewReferralReward(token);
  const style = STATUS_STYLES[reward.status];
  const isPending = reward.status === 'PENDING_REVIEW';

  function decide(decision: 'APPROVE' | 'REJECT') {
    review.mutate(
      { rewardId: reward.id, decision, note: note.trim() || undefined },
      {
        onSuccess: (res) =>
          toast.success(
            decision === 'APPROVE'
              ? `Récompense approuvée : +${res.points} point(s) au parrain.`
              : 'Récompense refusée.',
          ),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Arbitrage refusé.'),
      },
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {reward.referredUser.nom ?? 'Filleul sans nom'}
            <span className="text-zinc-400 font-normal"> → </span>
            {reward.referrer.nom ?? 'Parrain sans nom'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Commande #{reward.orderId.slice(-6).toUpperCase()} · {formatDate(reward.decidedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${style.tone}`}>
            {style.label}
          </span>
          <span className={`text-sm font-bold tabular-nums ${scoreTone(reward.riskScore)}`}>
            {reward.riskScore}
          </span>
        </div>
      </div>

      {/* Les signaux, figés au moment de la décision. Les poids peuvent
          changer ; ce qui a été décidé hier doit rester explicable demain. */}
      {reward.riskSignals.length > 0 ? (
        <ul className="space-y-1 mb-3">
          {reward.riskSignals.map((signal, i) => (
            <li key={`${signal.code}-${i}`} className="flex items-start gap-2 text-xs">
              <ShieldAlert size={12} className="text-amber-500 mt-0.5 shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300">
                <span className="font-mono text-[10px] text-zinc-400">{signal.code}</span>{' '}
                {signal.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-400 mb-3">Aucun signal de risque.</p>
      )}

      {reward.points > 0 && pointValueLabel && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
          +{reward.points} point(s) versé(s) — {pointValueLabel}
        </p>
      )}

      {reward.reviewNote && (
        <p className="text-xs text-zinc-500 italic mb-3">« {reward.reviewNote} »</p>
      )}

      {isPending && (
        <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note d'arbitrage (facultative)"
            maxLength={500}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => decide('APPROVE')}
              disabled={review.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              <Check size={12} /> Approuver
            </button>
            <button
              onClick={() => decide('REJECT')}
              disabled={review.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-red-600 text-white disabled:opacity-50"
            >
              <X size={12} /> Refuser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
