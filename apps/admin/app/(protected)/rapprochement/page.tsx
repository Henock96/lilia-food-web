'use client';

import { useState } from 'react';
import {
  useImportReconciliationExport,
  useReconciliationItem,
  useReconciliationItems,
  useReconciliationSummary,
  useResolveReconciliationItem,
  useRunReconciliationScan,
} from '@lilia/api-client';
import type {
  ReconciliationBlockScope,
  ReconciliationItem,
  ReconciliationProviderRow,
  ReconciliationResolutionKind,
} from '@lilia/types';
import { RefreshCw, ScanSearch, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { ageLabel } from '@/lib/ops-links';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card';
const btnCls =
  'inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700 disabled:opacity-50';
const inputCls =
  'rounded-lg border border-zinc-200 bg-transparent px-2 py-1 dark:border-zinc-700';

const BLOCK: Record<ReconciliationBlockScope, { label: string; cls: string }> = {
  GLOBAL: {
    label: 'Bloque tous les versements',
    cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  VENDOR: {
    label: 'Bloque ce vendeur',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  NONE: {
    label: 'Non bloquant',
    cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400',
  },
};

const RESOLUTION: Record<ReconciliationResolutionKind, string> = {
  EXPLAINED: 'Expliqué (aucune correction nécessaire)',
  CORRECTED: 'Corrigé (préciser comment)',
  WRITTEN_OFF: 'Passé en perte (préciser le montant et la décision)',
};

const xaf = (n: number | null) =>
  n == null ? '—' : `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Rapprochement Lilia ↔ prestataire (lot 2, 30/10/2026).
 *
 * Le serveur compare, classe et décide du blocage des versements ; cette page
 * affiche ses verdicts et porte les gestes humains. Un écart ne se ferme
 * jamais tout seul : on le résout avec un motif, ou il reste ouvert.
 */
export default function RapprochementPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [selected, setSelected] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const summary = useReconciliationSummary(token);
  const items = useReconciliationItems(token, status);
  const scan = useRunReconciliationScan(token);

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(`Contrôle terminé : ${r.findings} écart(s), ${r.opened} nouveau(x).`),
      onError: (e) => toast.error(apiMessage(e, 'Contrôle impossible.')),
    });

  return (
    <div className="max-w-5xl space-y-4">
      {summary.data && (
        <div
          className={`${cardCls} p-4 ${
            summary.data.payoutsGloballyBlocked ? 'border-red-300 dark:border-red-500/40' : ''
          }`}
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {summary.data.payoutsGloballyBlocked
              ? 'Versements suspendus : au moins un écart bloque tout le compte prestataire.'
              : summary.data.openItems === 0
                ? 'Aucun écart ouvert.'
                : `${summary.data.openItems} écart(s) ouvert(s).`}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {summary.data.globalBlocking} bloquant(s) global · {summary.data.vendorBlocking}{' '}
            bloquant(s) vendeur · critiques {summary.data.bySeverity.CRITICAL}
            {summary.data.lastRun
              ? ` · dernier passage ${ageLabel(summary.data.lastRun.createdAt)}`
              : ' · aucun passage encore'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['OPEN', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`${btnCls} ${
              status === s ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''
            }`}
          >
            {s === 'OPEN' ? 'Ouverts' : 'Résolus'}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" className={btnCls} onClick={runScan} disabled={scan.isPending}>
          <ScanSearch size={12} /> Contrôler la base
        </button>
        <button type="button" className={btnCls} onClick={() => setShowImport((v) => !v)}>
          <Upload size={12} /> Importer un export
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => {
            void summary.refetch();
            void items.refetch();
          }}
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {showImport && <ImportPanel token={token} onDone={() => setShowImport(false)} />}

      {items.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : items.isError || !items.data ? (
        <div className={`${cardCls} p-6 text-center text-sm`}>
          <p className="text-red-500">{apiMessage(items.error, 'Impossible de charger les écarts.')}</p>
          <button type="button" className={`${btnCls} mt-3`} onClick={() => void items.refetch()}>
            Réessayer
          </button>
        </div>
      ) : items.data.items.length === 0 ? (
        <p className={`${cardCls} p-6 text-center text-sm text-zinc-500`}>
          {status === 'OPEN' ? 'Aucun écart ouvert.' : 'Aucun écart résolu.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.data.items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              open={selected === it.id}
              onToggle={() => setSelected(selected === it.id ? null : it.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemRow({
  item,
  open,
  onToggle,
}: {
  item: ReconciliationItem;
  open: boolean;
  onToggle: () => void;
}) {
  const b = BLOCK[item.blockScope];
  return (
    <li className={`${cardCls} p-4`}>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {item.label}
              <span className="ml-2 text-xs font-normal text-zinc-400">{item.severity}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>
          </div>
          {item.status === 'OPEN' && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          Attendu {xaf(item.expectedXaf)} · constaté {xaf(item.actualXaf)}
          {item.orderId ? ` · commande ${item.orderId}` : ''}
          {item.externalId ? ` · réf. ${item.externalId}` : ''} · vu {ageLabel(item.lastSeenAt)}
        </p>
      </button>
      {open && <ItemDetail id={item.id} />}
    </li>
  );
}

function ItemDetail({ id }: { id: string }) {
  const { token } = useAuthStore();
  const detail = useReconciliationItem(token, id);
  const resolve = useResolveReconciliationItem(token);
  const [kind, setKind] = useState<ReconciliationResolutionKind>('EXPLAINED');
  const [note, setNote] = useState('');

  if (detail.isLoading) return <Skeleton className="mt-3 h-24 rounded-xl" />;
  if (detail.isError || !detail.data) {
    return <p className="mt-3 text-xs text-red-500">{apiMessage(detail.error, 'Détail indisponible.')}</p>;
  }
  const it = detail.data;

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
      {it.procedure && (
        <p className="text-zinc-600 dark:text-zinc-300">
          <span className="font-medium">Que faire : </span>
          {it.procedure}
        </p>
      )}
      <ol className="space-y-1 text-zinc-500 dark:text-zinc-400">
        {(it.events ?? []).map((e) => (
          <li key={e.id}>
            {new Date(e.createdAt).toLocaleString('fr-FR')} — {e.kind}
            {e.note ? ` : ${e.note}` : ''}
          </li>
        ))}
      </ol>
      {it.status === 'OPEN' ? (
        <form
          className="space-y-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            resolve.mutate(
              { id, kind, note },
              {
                onSuccess: () => toast.success('Écart résolu.'),
                onError: (e) => toast.error(apiMessage(e, 'Résolution impossible.')),
              },
            );
          }}
        >
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReconciliationResolutionKind)}
            className={`w-full ${inputCls}`}
          >
            {Object.entries(RESOLUTION).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Motif : ce qui explique l’écart, ou ce qui a été corrigé (10 caractères au moins)"
            className={`w-full ${inputCls}`}
          />
          <button type="submit" className={btnCls} disabled={resolve.isPending || note.trim().length < 10}>
            Résoudre l’écart
          </button>
        </form>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-300">
          Résolu {it.resolvedAt ? ageLabel(it.resolvedAt) : ''} —{' '}
          {it.resolutionKind ? RESOLUTION[it.resolutionKind] : ''} : {it.resolutionNote}
        </p>
      )}
    </div>
  );
}

/**
 * Import d'un export prestataire DÉJÀ NORMALISÉ (une ligne par transaction).
 * Le format réel de l'export pawaPay n'a pas été vérifié : la conversion se
 * fait hors de cette page tant qu'il ne l'est pas. Le serveur valide tout.
 */
function ImportPanel({ token, onDone }: { token: string | null; onDone: () => void }) {
  const importExport = useImportReconciliationExport(token);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [wallet, setWallet] = useState('');
  const [rowsJson, setRowsJson] = useState('');

  const submit = () => {
    let rows: ReconciliationProviderRow[];
    try {
      rows = JSON.parse(rowsJson) as ReconciliationProviderRow[];
      if (!Array.isArray(rows)) throw new Error('not an array');
    } catch {
      toast.error('Lignes illisibles : un tableau JSON est attendu.');
      return;
    }
    importExport.mutate(
      {
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        walletBalanceXaf: wallet.trim() === '' ? null : Number(wallet),
        rows,
      },
      {
        onSuccess: (r) => {
          toast.success(
            r.duplicate
              ? 'Cet export a déjà été importé : rien n’a été réécrit.'
              : `Import terminé : ${r.findings} écart(s), ${r.opened} nouveau(x), ${r.reopened} rouvert(s).`,
          );
          onDone();
        },
        onError: (e) => toast.error(apiMessage(e, 'Import impossible.')),
      },
    );
  };

  return (
    <div className={`${cardCls} space-y-2 p-4 text-xs`}>
      <p className="text-zinc-500 dark:text-zinc-400">
        Lignes normalisées :{' '}
        {'{ externalId, kind: "DEPOSIT" | "PAYOUT", status, amountXaf, currency, feeXaf? }'}. Montants en
        entiers FCFA. Le même export ne s’importe qu’une fois.
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1">
          Début (inclus)
          <input
            type="datetime-local"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          Fin (exclue)
          <input
            type="datetime-local"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          Solde du wallet en fin de période (facultatif)
          <input
            inputMode="numeric"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <textarea
        value={rowsJson}
        onChange={(e) => setRowsJson(e.target.value)}
        rows={6}
        placeholder='[{"externalId":"…","kind":"DEPOSIT","status":"COMPLETED","amountXaf":4450,"currency":"XAF"}]'
        className={`w-full font-mono ${inputCls}`}
      />
      <button
        type="button"
        className={btnCls}
        onClick={submit}
        disabled={importExport.isPending || !periodStart || !periodEnd || !rowsJson.trim()}
      >
        Importer
      </button>
    </div>
  );
}
