'use client';

import { useState } from 'react';
import { AUDIT_LOG_PAGE_SIZE, useAuditLog } from '@lilia/api-client';
import type { AdminAuditAction } from '@lilia/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { ADMIN_AUDIT_ACTIONS, AUDIT_ACTION_LABELS, auditActionLabel, settingsDiffLines } from '@/lib/audit-labels';
import { apiMessage } from '@/lib/api-message';

/**
 * Journal d'audit — lecture seule (ADM-PARITY-001).
 *
 * Le backend journalise chaque geste sensible (rôles, reversements, blocage de
 * version, valeur du point…) avec son auteur et, pour la configuration, les
 * valeurs avant/après. Seul l'Admin Flutter savait le lire : depuis un poste,
 * impossible de répondre à « qui a posé ce blocage, et quand ? ».
 */
export default function JournalPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AdminAuditAction | ''>('');
  const { data, isLoading, isError, error, isFetching } = useAuditLog(token, page, action);

  const total = data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / AUDIT_LOG_PAGE_SIZE));

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Actions d&apos;administration, de la plus récente à la plus ancienne. Aucune ne peut être modifiée ni
          supprimée.
        </p>
        <select
          aria-label="Filtrer par action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value as AdminAuditAction | '');
            setPage(1);
          }}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
        >
          <option value="">Toutes les actions</option>
          {ADMIN_AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <p role="alert" className="text-sm text-red-500">
          Impossible de charger le journal : {apiMessage(error, 'erreur inconnue')}
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.data.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune entrée{action ? ' pour cette action' : ''}.</p>
      ) : (
        <ul className={`space-y-2 ${isFetching ? 'opacity-60' : ''}`}>
          {data?.data.map((entry) => {
            const diff = entry.action === 'PLATFORM_SETTINGS_CHANGED' ? settingsDiffLines(entry.metadata) : [];
            return (
              <li
                key={entry.id}
                className="bg-white dark:bg-dark-card rounded-xl border border-zinc-200 dark:border-dark-border p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {auditActionLabel(entry.action)}
                  </span>
                  <time className="text-xs text-zinc-400" dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString('fr-FR')}
                  </time>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 break-all">
                  Par {entry.actor?.nom || entry.actor?.email || 'auteur inconnu'} · {entry.targetType}{' '}
                  {entry.targetId}
                </p>
                {entry.reason && <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">Motif : {entry.reason}</p>}
                {diff.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs font-mono text-zinc-600 dark:text-zinc-300 break-all">
                    {diff.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {total > AUDIT_LOG_PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-zinc-500">
            Page {page} / {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
