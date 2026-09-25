'use client';

import { useState } from 'react';
import {
  useAdminAccounts,
  useApprovals,
  useApproveApproval,
  useRejectApproval,
} from '@lilia/api-client';
import type { ApprovalStatus, FinancialApproval } from '@lilia/types';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { approvalActions, describeApproval, expiresLabel } from '@/lib/approvals-view';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card';

const TABS: { value: ApprovalStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'ALL', label: 'Historique' },
];

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée — exécution en cours',
  REJECTED: 'Refusée',
  EXPIRED: 'Expirée ou retirée',
  CONSUMED: 'Exécutée',
};

/**
 * Gestes financiers à deux administrateurs (F3-08).
 *
 * Changer le numéro de versement d'un vendeur, rembourser 50 000 FCFA ou plus,
 * modifier des droits d'administrateur : un admin DEMANDE, un autre APPROUVE —
 * et le geste s'exécute à ce moment. Le demandeur ne voit jamais le bouton
 * « Approuver ». Une demande non traitée expire au bout de 24 h.
 */
export default function ApprobationsPage() {
  const { token, user } = useAuthStore();
  const [tab, setTab] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const query = useApprovals(token, tab);
  const admins = useAdminAccounts(token);
  const approve = useApproveApproval(token);
  const reject = useRejectApproval(token);

  const nameOf = (id: string | null) =>
    admins.data?.find((a) => a.id === id)?.nom ??
    admins.data?.find((a) => a.id === id)?.email ??
    'un administrateur';
  const me = user
    ? {
        id: user.id,
        capabilities: admins.data?.find((a) => a.id === user.id)?.adminCapabilities,
      }
    : null;

  function onApprove(a: FinancialApproval) {
    const { title } = describeApproval(a);
    if (!window.confirm(`Approuver et exécuter : ${title} ?`)) return;
    approve.mutate(a.id, {
      onSuccess: () => toast.success('Approuvé — le geste a été exécuté.'),
      onError: (e) => toast.error(apiMessage(e, 'Approbation impossible')),
    });
  }

  function onReject(a: FinancialApproval, withdraw: boolean) {
    const reason = window.prompt(
      withdraw ? 'Pourquoi retirer cette demande ?' : 'Motif du refus (communiqué au demandeur) :',
    );
    if (!reason || reason.trim().length < 3) return;
    reject.mutate(
      { id: a.id, reason: reason.trim() },
      {
        onSuccess: () => toast.success(withdraw ? 'Demande retirée.' : 'Demande refusée.'),
        onError: (e) => toast.error(apiMessage(e, 'Refus impossible')),
      },
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={20} /> Approbations
        </h1>
        <p className="text-sm text-zinc-500">
          Gestes financiers qui exigent un second administrateur. Vérifiez chaque
          demande par un autre canal (par exemple en appelant le vendeur) avant
          d’approuver : l’approbation exécute le geste.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t.value
                ? 'bg-primary-600 text-white'
                : 'bg-zinc-100 text-zinc-600 dark:bg-dark-card dark:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : query.isError ? (
        <div className={`${cardCls} p-6 text-center text-sm text-red-500`}>
          {apiMessage(query.error, 'Impossible de charger les demandes.')}
        </div>
      ) : !query.data?.length ? (
        <div className={`${cardCls} p-10 text-center text-sm text-zinc-500`}>
          {tab === 'PENDING' ? 'Aucune demande en attente.' : 'Aucune demande.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {query.data.map((a) => {
            const { title, detail } = describeApproval(a);
            const actions = approvalActions(a, me);
            return (
              <li key={a.id} className={`${cardCls} p-4 space-y-2`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 break-all">{detail}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Demandée par {nameOf(a.requestedBy)}
                      {a.status === 'PENDING'
                        ? ` · ${expiresLabel(a.expiresAt)}`
                        : a.approvedBy
                          ? ` · décidée par ${nameOf(a.approvedBy)}`
                          : ''}
                      {a.reason ? ` · motif : ${a.reason}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 dark:bg-dark-border px-2 py-0.5 text-[11px]">
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                {(actions.approve || actions.reject || actions.withdraw) && (
                  <div className="flex gap-2 justify-end">
                    {actions.withdraw && (
                      <button
                        type="button"
                        onClick={() => onReject(a, true)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border"
                      >
                        Retirer ma demande
                      </button>
                    )}
                    {actions.reject && (
                      <button
                        type="button"
                        disabled={reject.isPending}
                        onClick={() => onReject(a, false)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
                      >
                        Refuser
                      </button>
                    )}
                    {actions.approve && (
                      <button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => onApprove(a)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
                      >
                        Approuver et exécuter
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
