'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useAdminQuartiers,
  useCreateDeliveryTariff,
  useDeleteDeliveryTariff,
  useDeliveryTariffs,
  usePlatformSettings,
  usePublishDeliveryTariff,
  useSimulateDeliveryTariff,
  useUpdateDeliveryTariff,
} from '@lilia/api-client';
import type { DeliveryTariff, DeliveryTariffSimulation, Quartier } from '@lilia/types';
import { toast } from 'sonner';
import { Copy, FlaskConical, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import {
  EMPTY_TARIFF_FORM,
  formFromTariff,
  tariffFormToDto,
  type TariffForm,
} from '@/lib/tariff-draft';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
const btnCls =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50';

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const STATUS_LABEL: Record<DeliveryTariff['status'], { text: string; cls: string }> = {
  DRAFT: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  PUBLISHED: { text: 'En vigueur', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  RETIRED: { text: 'Retirée', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300' },
};

/**
 * Grille de livraison plateforme (F3-02).
 *
 * Une version publiée ne se modifie jamais : chaque commande fige le numéro de
 * la grille qui l'a chiffrée. On corrige donc en **publiant une nouvelle
 * version** — et on revient en arrière en dupliquant l'ancienne. Aucun prix
 * n'est calculé dans cette page : le simulateur est une réponse du serveur,
 * sur le même moteur que le checkout.
 */
export default function TarifsLivraisonPage() {
  const { token } = useAuthStore();
  const tariffs = useDeliveryTariffs(token);
  const settings = usePlatformSettings(token);
  const quartiers = useAdminQuartiers(token);
  const [editor, setEditor] = useState<{ id: string | null; form: TariffForm } | null>(null);
  const [simulation, setSimulation] = useState<DeliveryTariffSimulation | null>(null);

  const quartierNames = useMemo(
    () => new Map((quartiers.data ?? []).map((q) => [q.id, q.nom])),
    [quartiers.data],
  );
  const hasDraft = (tariffs.data ?? []).some((t) => t.status === 'DRAFT');

  return (
    <div className="max-w-5xl space-y-4">
      <ModeBanner mode={settings.data?.deliveryPricingMode} />

      {editor ? (
        <TariffEditor
          key={editor.id ?? 'new'}
          id={editor.id}
          initial={editor.form}
          quartiers={quartiers.data ?? []}
          token={token}
          onDone={() => setEditor(null)}
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            className={btnCls}
            // Un seul brouillon à la fois : deux brouillons concurrents
            // finiraient par être publiés l'un par-dessus l'autre.
            disabled={hasDraft}
            title={hasDraft ? 'Un brouillon existe déjà : modifiez-le ou supprimez-le.' : undefined}
            onClick={() => setEditor({ id: null, form: EMPTY_TARIFF_FORM })}
          >
            <Plus size={14} /> Nouveau brouillon
          </button>
        </div>
      )}

      {simulation && (
        <SimulationPanel simulation={simulation} onClose={() => setSimulation(null)} />
      )}

      {tariffs.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : tariffs.isError ? (
        <div className={`${cardCls} text-center text-sm`}>
          <p className="text-red-500">
            {apiMessage(tariffs.error, 'Impossible de charger les grilles de livraison.')}
          </p>
          <button type="button" className={`${btnCls} mt-3`} onClick={() => void tariffs.refetch()}>
            Réessayer
          </button>
        </div>
      ) : !tariffs.data?.length ? (
        <div className={`${cardCls} text-center text-sm text-zinc-500`}>
          Aucune grille. Créez un brouillon, ou amorcez-le depuis les prix actuels
          des vendeurs avec <code>scripts/db/seed-delivery-tariff.js</code>.
        </div>
      ) : (
        tariffs.data.map((tariff) => (
          <TariffCard
            key={tariff.id}
            tariff={tariff}
            token={token}
            quartierNames={quartierNames}
            hasDraft={hasDraft}
            onEdit={() => setEditor({ id: tariff.id, form: formFromTariff(tariff) })}
            onDuplicate={() => setEditor({ id: null, form: formFromTariff(tariff) })}
            onSimulated={setSimulation}
          />
        ))
      )}
    </div>
  );
}

function ModeBanner({ mode }: { mode: 'VENDOR_LEGACY' | 'PLATFORM' | undefined }) {
  if (!mode) return null;
  return (
    <div className={`${cardCls} text-sm`}>
      {mode === 'PLATFORM' ? (
        <p className="text-zinc-700 dark:text-zinc-300">
          <strong>Mode plateforme actif.</strong> Le prix de chaque livraison vient de la grille
          en vigueur ; les tarifs et zones des vendeurs ne fixent plus de prix.
        </p>
      ) : (
        <p className="text-zinc-700 dark:text-zinc-300">
          <strong>Mode vendeur actif</strong> : chaque vendeur fixe encore son prix de livraison.
          La grille publiée ici ne s&apos;applique qu&apos;après la bascule, dans{' '}
          <Link href="/parametres" className="text-primary-600 hover:underline dark:text-primary-400">
            Paramètres
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function TariffCard({
  tariff,
  token,
  quartierNames,
  hasDraft,
  onEdit,
  onDuplicate,
  onSimulated,
}: {
  tariff: DeliveryTariff;
  token: string | null;
  quartierNames: Map<string, string>;
  hasDraft: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onSimulated: (s: DeliveryTariffSimulation) => void;
}) {
  const publish = usePublishDeliveryTariff(token);
  const remove = useDeleteDeliveryTariff(token);
  const simulate = useSimulateDeliveryTariff(token);
  const status = STATUS_LABEL[tariff.status];
  const bands = [...tariff.bands].sort((a, b) => a.maxKm - b.maxKm);

  function handlePublish() {
    if (
      !window.confirm(
        `Publier la grille v${tariff.version} ?\n\nElle remplace la grille en vigueur pour toutes les prochaines commandes et fixe l'assiette de la paie des livreurs. Les commandes déjà passées gardent leur prix.`,
      )
    )
      return;
    publish.mutate(tariff.id, {
      onSuccess: () => toast.success(`Grille v${tariff.version} publiée.`),
      onError: (e) => toast.error(apiMessage(e, 'Publication impossible.')),
    });
  }

  function handleDelete() {
    if (!window.confirm(`Supprimer le brouillon v${tariff.version} ?`)) return;
    remove.mutate(tariff.id, {
      onSuccess: () => toast.success('Brouillon supprimé.'),
      onError: (e) => toast.error(apiMessage(e, 'Suppression impossible.')),
    });
  }

  function handleSimulate() {
    simulate.mutate(tariff.id, {
      onSuccess: onSimulated,
      onError: (e) => toast.error(apiMessage(e, 'Simulation impossible.')),
    });
  }

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Grille v{tariff.version}
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
            {status.text}
          </span>
          {tariff.publishedAt && (
            <span className="text-xs text-zinc-400">
              publiée le {new Date(tariff.publishedAt).toLocaleString('fr-FR')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnCls} onClick={handleSimulate} disabled={simulate.isPending}>
            <FlaskConical size={14} /> {simulate.isPending ? 'Simulation…' : 'Simuler'}
          </button>
          {tariff.status === 'DRAFT' ? (
            <>
              <button type="button" className={btnCls} onClick={onEdit}>
                <Pencil size={14} /> Modifier
              </button>
              <button type="button" className={btnCls} onClick={handlePublish} disabled={publish.isPending}>
                <Send size={14} /> Publier
              </button>
              <button type="button" className={btnCls} onClick={handleDelete} disabled={remove.isPending}>
                <Trash2 size={14} /> Supprimer
              </button>
            </>
          ) : (
            <button
              type="button"
              className={btnCls}
              onClick={onDuplicate}
              disabled={hasDraft}
              title={hasDraft ? 'Un brouillon existe déjà.' : 'Repartir de cette version'}
            >
              <Copy size={14} /> Dupliquer en brouillon
            </button>
          )}
        </div>
      </div>

      {tariff.note && <p className="mt-2 text-xs text-zinc-500">{tariff.note}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Tranches (coefficient routier {tariff.roadFactor})
          </p>
          <table className="w-full text-sm">
            <tbody>
              {bands.map((b, i) => (
                <tr key={b.maxKm} className="border-b border-zinc-100 dark:border-dark-border last:border-0">
                  <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                    {i === 0 ? 0 : bands[i - 1].maxKm} → {b.maxKm} km
                  </td>
                  <td className="py-1.5 text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {fmt(b.feeXaf)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-zinc-400">
            Au-delà de {bands[bands.length - 1]?.maxKm} km, et quand une position manque : le prix
            de la dernière tranche.
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Prix fixes par trajet ({tariff.overrides.length})
          </p>
          {tariff.overrides.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {tariff.overrides.map((o) => (
                <li key={`${o.originQuartierId}-${o.destQuartierId}`} className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {quartierNames.get(o.originQuartierId) ?? '?'} →{' '}
                    {quartierNames.get(o.destQuartierId) ?? '?'}
                  </span>
                  <span className="font-medium">{fmt(o.feeXaf)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TariffEditor({
  id,
  initial,
  quartiers,
  token,
  onDone,
}: {
  id: string | null;
  initial: TariffForm;
  quartiers: Quartier[];
  token: string | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<TariffForm>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const create = useCreateDeliveryTariff(token);
  const update = useUpdateDeliveryTariff(token);
  const saving = create.isPending || update.isPending;

  function save() {
    const result = tariffFormToDto(form);
    if (!result.dto) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    const options = {
      onSuccess: () => {
        toast.success(id ? 'Brouillon enregistré.' : 'Brouillon créé.');
        onDone();
      },
      onError: (e: unknown) => toast.error(apiMessage(e, 'Enregistrement impossible.')),
    };
    if (id) update.mutate({ id, ...result.dto }, options);
    else create.mutate(result.dto, options);
  }

  const setBand = (i: number, patch: Partial<TariffForm['bands'][number]>) =>
    setForm((f) => ({ ...f, bands: f.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const setOverride = (i: number, patch: Partial<TariffForm['overrides'][number]>) =>
    setForm((f) => ({
      ...f,
      overrides: f.overrides.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    }));

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{id ? 'Modifier le brouillon' : 'Nouveau brouillon'}</h3>
        <button type="button" onClick={onDone} aria-label="Fermer">
          <X size={16} />
        </button>
      </div>

      <label className="block max-w-xs text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Coefficient routier</span>
        <input
          className={inputCls}
          inputMode="decimal"
          value={form.roadFactor}
          onChange={(e) => setForm({ ...form, roadFactor: e.target.value })}
        />
        <span className="text-xs text-zinc-400">
          Distance à vol d&apos;oiseau × ce coefficient ≈ distance par la route.
        </span>
      </label>

      <div>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Tranches de distance</p>
        <div className="space-y-2">
          {form.bands.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs text-zinc-400">jusqu&apos;à</span>
              <input
                className={inputCls}
                inputMode="decimal"
                placeholder="km"
                value={b.maxKm}
                onChange={(e) => setBand(i, { maxKm: e.target.value })}
              />
              <span className="text-xs text-zinc-400">km</span>
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="FCFA"
                value={b.feeXaf}
                onChange={(e) => setBand(i, { feeXaf: e.target.value })}
              />
              <button
                type="button"
                aria-label="Retirer la tranche"
                onClick={() => setForm((f) => ({ ...f, bands: f.bands.filter((_, j) => j !== i) }))}
              >
                <Trash2 size={14} className="text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnCls} mt-2`}
          onClick={() => setForm((f) => ({ ...f, bands: [...f.bands, { maxKm: '', feeXaf: '' }] }))}
        >
          <Plus size={14} /> Tranche
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Prix fixes par trajet (quartier du vendeur → quartier du client)
        </p>
        <div className="space-y-2">
          {form.overrides.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className={inputCls}
                value={o.originQuartierId}
                onChange={(e) => setOverride(i, { originQuartierId: e.target.value })}
              >
                <option value="">Départ…</option>
                {quartiers.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.nom}
                  </option>
                ))}
              </select>
              <span className="text-zinc-400">→</span>
              <select
                className={inputCls}
                value={o.destQuartierId}
                onChange={(e) => setOverride(i, { destQuartierId: e.target.value })}
              >
                <option value="">Arrivée…</option>
                {quartiers.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.nom}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="FCFA"
                value={o.feeXaf}
                onChange={(e) => setOverride(i, { feeXaf: e.target.value })}
              />
              <button
                type="button"
                aria-label="Retirer le prix fixe"
                onClick={() =>
                  setForm((f) => ({ ...f, overrides: f.overrides.filter((_, j) => j !== i) }))
                }
              >
                <Trash2 size={14} className="text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnCls} mt-2`}
          onClick={() =>
            setForm((f) => ({
              ...f,
              overrides: [...f.overrides, { originQuartierId: '', destQuartierId: '', feeXaf: '' }],
            }))
          }
        >
          <Plus size={14} /> Prix fixe
        </button>
      </div>

      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Note (motif du changement)</span>
        <input
          className={inputCls}
          maxLength={300}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </label>

      {errors.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnCls} onClick={onDone}>
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
        </button>
      </div>
    </div>
  );
}

function SimulationPanel({
  simulation,
  onClose,
}: {
  simulation: DeliveryTariffSimulation;
  onClose: () => void;
}) {
  const vendors = useMemo(
    () => [...new Map(simulation.matrix.map((r) => [r.vendorId, r.vendorName])).entries()],
    [simulation.matrix],
  );
  const [vendorId, setVendorId] = useState(vendors[0]?.[0] ?? '');
  const rows = simulation.matrix.filter((r) => r.vendorId === vendorId);
  const { replay } = simulation;

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Simulation — grille v{simulation.version}</h3>
        <button type="button" onClick={onClose} aria-label="Fermer">
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <Stat label={`Commandes payées (${simulation.windowDays} j)`} value={String(replay.orders)} />
        <Stat label="Prix de base réels" value={fmt(replay.historicalBaseXaf)} />
        <Stat label="Avec cette grille" value={fmt(replay.simulatedBaseXaf)} />
        <Stat
          label="Écart (clients et assiette livreurs)"
          value={`${replay.deltaXaf > 0 ? '+' : ''}${fmt(replay.deltaXaf)}`}
        />
      </div>
      {replay.orders === 0 && (
        <p className="text-xs text-zinc-500">
          Aucune commande payée sur la période : le rejeu est vide, la matrice ci-dessous reste
          la seule vérification.
        </p>
      )}
      {replay.fallbackOrders > 0 && (
        <p className="text-xs text-amber-700">
          {replay.fallbackOrders} commande(s) chiffrée(s) au prix de la dernière tranche faute de
          position (vendeur sans GPS ou quartier sans centroïde).
        </p>
      )}

      {vendors.length > 0 && (
        <div>
          <label className="mb-2 block max-w-xs text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Prix par quartier depuis</span>
            <select className={inputCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              {vendors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-400">
                <th className="py-1 font-medium">Quartier</th>
                <th className="py-1 font-medium">Distance</th>
                <th className="py-1 text-right font-medium">Prix</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.quartierId} className="border-t border-zinc-100 dark:border-dark-border">
                  <td className="py-1.5">{r.quartierName}</td>
                  <td className="py-1.5 text-zinc-500">
                    {r.basis === 'OVERRIDE'
                      ? 'prix fixe'
                      : r.distanceKm != null
                        ? `${r.distanceKm.toLocaleString('fr-FR')} km`
                        : 'position inconnue'}
                  </td>
                  <td className="py-1.5 text-right font-medium">{fmt(r.baseFeeXaf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
