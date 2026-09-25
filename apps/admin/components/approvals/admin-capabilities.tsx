'use client';

import { useState } from 'react';
import { useAdminAccounts, useRequestCapabilities } from '@lilia/api-client';
import type { AdminAccount, AdminCapability } from '@lilia/types';
import { toast } from 'sonner';

import { apiMessage } from '@/lib/api-message';
import { CAPABILITY_LABELS } from '@/lib/approvals-view';

const ALL: AdminCapability[] = [
  'FINANCE_EXECUTE',
  'FINANCE_APPROVE',
  'USER_ROLES',
  'SETTINGS',
  'SUPPORT',
];

/**
 * Droits des administrateurs (F3-08). Modifier des droits crée une DEMANDE :
 * rien ne change avant qu'un autre administrateur l'approuve (D7).
 */
export function AdminCapabilities({ token }: { token: string | null }) {
  const admins = useAdminAccounts(token);
  if (admins.isLoading) return <p className="text-sm text-zinc-500">Chargement…</p>;
  if (admins.isError) {
    return (
      <p className="text-sm text-red-500">
        {apiMessage(admins.error, 'Impossible de charger les administrateurs.')}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {admins.data?.map((a) => <AdminRow key={a.id} admin={a} token={token} />)}
    </ul>
  );
}

function AdminRow({ admin, token }: { admin: AdminAccount; token: string | null }) {
  const [draft, setDraft] = useState<AdminCapability[]>(admin.adminCapabilities);
  const request = useRequestCapabilities(token);
  const changed =
    [...draft].sort().join() !== [...admin.adminCapabilities].sort().join();

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-dark-border dark:bg-dark-card">
      <p className="text-sm font-semibold">{admin.nom ?? admin.email}</p>
      <p className="text-xs text-zinc-400">{admin.email}</p>
      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        {ALL.map((cap) => (
          <label key={cap} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={draft.includes(cap)}
              onChange={(e) =>
                setDraft((d) => (e.target.checked ? [...d, cap] : d.filter((c) => c !== cap)))
              }
            />
            {CAPABILITY_LABELS[cap]}
          </label>
        ))}
      </div>
      {changed && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraft(admin.adminCapabilities)}
            className="px-3 py-1.5 text-xs text-zinc-600"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={request.isPending}
            onClick={() =>
              request.mutate(
                { userId: admin.id, capabilities: draft },
                {
                  onSuccess: () =>
                    toast.info(
                      'Demande envoyée : un autre administrateur doit l’approuver avant que les droits changent.',
                    ),
                  onError: (e) => toast.error(apiMessage(e, 'Demande impossible')),
                },
              )
            }
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Demander ce changement
          </button>
        </div>
      )}
    </li>
  );
}
