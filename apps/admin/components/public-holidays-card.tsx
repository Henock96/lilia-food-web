'use client';

import { useState } from 'react';
import {
  useCreatePublicHoliday,
  useDeletePublicHoliday,
  usePublicHolidays,
} from '@lilia/api-client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { apiMessage } from '@/lib/api-message';

const CARD =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const INPUT =
  'text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100';

/**
 * Calendrier des jours fériés (F3-03). Rien n'est semé : la liste officielle
 * (fêtes mobiles, jours décrétés) se saisit ici. Les vendeurs « fermés les
 * jours fériés » — le réglage par défaut — ferment ces jours-là.
 */
export function PublicHolidaysCard({ token }: { token: string | null }) {
  const holidays = usePublicHolidays(token);
  const create = useCreatePublicHoliday(token);
  const remove = useDeletePublicHoliday(token);
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');

  return (
    <div className={CARD}>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Jours fériés</h3>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
        Les vendeurs réglés « fermé les jours fériés » (par défaut) ferment toute la journée,
        heure de Brazzaville.
      </p>
      {holidays.isError ? (
        <p className="text-sm text-red-500">{apiMessage(holidays.error, 'Chargement impossible.')}</p>
      ) : (holidays.data ?? []).length === 0 ? (
        <p className="text-sm text-zinc-400 mb-3">
          {holidays.isLoading ? 'Chargement…' : 'Aucun jour férié saisi.'}
        </p>
      ) : (
        <ul className="mb-3 space-y-1 text-sm">
          {holidays.data!.map((h) => {
            const iso = h.date.slice(0, 10);
            return (
              <li key={iso} className="flex items-center justify-between">
                <span>
                  {iso.split('-').reverse().join('/')} — {h.label}
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${h.label}`}
                  onClick={() => {
                    if (!window.confirm(`Retirer « ${h.label} » des jours fériés ?`)) return;
                    remove.mutate(iso, {
                      onError: (e) => toast.error(apiMessage(e, 'Suppression impossible.')),
                    });
                  }}
                >
                  <Trash2 size={14} className="text-zinc-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          className={`${INPUT} flex-1`}
          placeholder="Libellé (ex : Fête de l'Indépendance)"
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={create.isPending || !date || label.trim().length < 2}
          onClick={() =>
            create.mutate(
              { date, label: label.trim() },
              {
                onSuccess: () => {
                  setDate('');
                  setLabel('');
                  toast.success('Jour férié ajouté');
                },
                onError: (e) => toast.error(apiMessage(e, 'Ajout impossible.')),
              },
            )
          }
          className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
