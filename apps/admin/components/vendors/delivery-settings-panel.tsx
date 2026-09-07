'use client';

import { useState } from 'react';
import {
  useCreateDeliveryZone,
  useDeleteDeliveryZone,
  useQuartiers,
  useUpdateDeliveryZone,
  useUpdateVendorDelivery,
  useVendorDeliveryZones,
  deliveryZoneKeys,
} from '@lilia/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { DeliveryPriceMode, DeliveryZone } from '@lilia/types';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Configuration de la livraison d'un vendeur — mode, tarif, grille de zones.
 *
 * ### Ce qui n'existait pas
 *
 * L'admin web laissait choisir « Selon la zone » (`/mon-restaurant`, wizard
 * d'onboarding) sans offrir nulle part de quoi définir une zone. `/zones`
 * renvoyait vers « le niveau de chaque restaurant », `/mon-restaurant`
 * renvoyait vers « Zones, par l'admin » : deux écrans qui se désignaient l'un
 * l'autre pour une fonction qu'aucun ne portait. Le CRUD backend existait
 * pourtant depuis le début — il n'avait simplement aucun appelant côté web.
 *
 * Résultat observé en production le 05/09/2026 : « Le Cosy Lounge Brazza » en
 * `ZONE_BASED` avec **zéro zone**, chaque livraison facturée au tarif de repli
 * sans qu'aucun écran ne le signale.
 *
 * ### Le bandeau de couverture est le vrai livrable
 *
 * Reconstruire la grille sans lui laisserait l'angle mort intact : c'est le
 * **repli silencieux** qui coûte de l'argent, pas l'absence de formulaire. Un
 * quartier hors de toute zone est facturé `fixedDeliveryFee` sous le libellé
 * interne « Zone par défaut » — une valeur que personne n'a choisie pour ce
 * quartier-là. Chez « Chez Maman Lili », 15 quartiers sur 21 étaient dans ce
 * cas, avec une grille réelle allant de 500 à 2 000 FCFA.
 *
 * La couverture est **calculée par le serveur** (`coverage` dans la réponse) :
 * la recalculer ici en donnerait une version web et une version Flutter, qui
 * divergeraient à la première évolution.
 */
export function DeliverySettingsPanel({
  vendorId,
  token,
}: {
  vendorId: string;
  token: string | null;
}) {
  const query = useVendorDeliveryZones(token, vendorId);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} flex flex-col items-center gap-3 text-sm`}>
        {/* Le serveur dit *pourquoi* : « Vous n'êtes pas autorisé à modifier ce
            restaurant », « Restaurant non trouvé ». Le masquer derrière un
            libellé générique rendrait chaque échec identique au suivant. */}
        <p className="text-center text-zinc-700 dark:text-zinc-300">
          {apiMessage(query.error, 'Impossible de charger la configuration de livraison.')}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ModeSection data={query.data} vendorId={vendorId} token={token} />
      {query.data.supportsDelivery && (
        <ZonesSection data={query.data} vendorId={vendorId} token={token} />
      )}
    </div>
  );
}

type PanelData = NonNullable<
  ReturnType<typeof useVendorDeliveryZones>['data']
>;

// ─── Mode, tarif fixe, minimum, délais ───────────────────────────────────────

function ModeSection({
  data,
  vendorId,
  token,
}: {
  data: PanelData;
  vendorId: string;
  token: string | null;
}) {
  const queryClient = useQueryClient();
  const update = useUpdateVendorDelivery(token, vendorId);

  const [delivery, setDelivery] = useState(data.supportsDelivery);
  const [pickup, setPickup] = useState(data.supportsPickup);
  const [mode, setMode] = useState<DeliveryPriceMode>(data.deliveryPriceMode);
  const [fee, setFee] = useState(String(data.fixedDeliveryFee));
  const [minOrder, setMinOrder] = useState(String(data.minimumOrderAmount));
  const [etaMin, setEtaMin] = useState(String(data.estimatedDeliveryTimeMin));
  const [etaMax, setEtaMax] = useState(String(data.estimatedDeliveryTimeMax));

  const zoneCount = data.zones.length;
  // Le bouton n'est pas désactivé quand la bascule est impossible : un bouton
  // grisé n'explique rien. On laisse partir la requête et on affiche le refus
  // du serveur, qui dit ce qui manque ET comment s'en sortir.
  const blockingHint =
    delivery && mode === 'ZONE_BASED' && zoneCount === 0
      ? 'Aucune zone définie : créez-en une ci-dessous avant d’enregistrer ce mode.'
      : null;

  function save() {
    const nums = { fee, minOrder, etaMin, etaMax };
    if (Object.values(nums).some((v) => v.trim() === '' || !Number.isFinite(Number(v)))) {
      toast.error('Les champs numériques doivent être renseignés');
      return;
    }
    update.mutate(
      {
        supportsDelivery: delivery,
        supportsPickup: pickup,
        deliveryPriceMode: mode,
        fixedDeliveryFee: Number(fee),
        minimumOrderAmount: Number(minOrder),
        estimatedDeliveryTimeMin: Number(etaMin),
        estimatedDeliveryTimeMax: Number(etaMax),
      },
      {
        onSuccess: () => {
          toast.success('Paramètres de livraison enregistrés');
          // La couverture dépend du mode et du tarif de repli : sans cette
          // invalidation, le bandeau continuerait d'annoncer l'ancien montant.
          void queryClient.invalidateQueries({
            queryKey: deliveryZoneKeys.vendor(vendorId),
          });
        },
        onError: (e) =>
          toast.error(apiMessage(e, 'Enregistrement impossible')),
      },
    );
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Mode de livraison
      </h3>

      <div className="space-y-2">
        <Toggle label="Livraison à domicile" checked={delivery} onChange={setDelivery} />
        <Toggle label="Retrait au comptoir" checked={pickup} onChange={setPickup} />
      </div>

      {delivery && (
        <>
          <Field label="Tarification">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['FIXED', 'Tarif fixe'],
                  ['ZONE_BASED', 'Par zone'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    mode === value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {blockingHint && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {blockingHint}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={
                mode === 'FIXED'
                  ? 'Frais de livraison (FCFA)'
                  : 'Tarif de repli (FCFA)'
              }
              hint={
                mode === 'ZONE_BASED'
                  ? 'Appliqué aux quartiers qui ne sont dans aucune zone.'
                  : undefined
              }
            >
              <input
                type="number"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Commande minimum (FCFA)">
              <input
                type="number"
                min="0"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Délai min (min)">
              <input
                type="number"
                min="0"
                value={etaMin}
                onChange={(e) => setEtaMin(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Délai max (min)">
              <input
                type="number"
                min="0"
                value={etaMax}
                onChange={(e) => setEtaMax(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="rounded-xl bg-primary-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ─── Grille des zones + couverture ───────────────────────────────────────────

function ZonesSection({
  data,
  vendorId,
  token,
}: {
  data: PanelData;
  vendorId: string;
  token: string | null;
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const remove = useDeleteDeliveryZone(token, vendorId);

  const { coverage, zones, deliveryPriceMode } = data;
  const gaps = coverage.uncovered.length;

  async function handleDelete(zone: DeliveryZone) {
    if (
      !window.confirm(
        `Supprimer la zone « ${zone.zoneName} » (${fmt(zone.fee)}) ? Ses ${zone.quartiers.length} quartier(s) repasseront au tarif de repli.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(zone.id);
      toast.success('Zone supprimée');
    } catch (e) {
      // Le serveur refuse la suppression de la dernière zone d'un vendeur
      // ZONE_BASED, et son message porte la sortie possible. Le remplacer par
      // « Suppression impossible » enlèverait justement ce qui aide.
      toast.error(apiMessage(e, 'Suppression impossible'));
    }
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Zones et tarifs
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setCreating((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900"
        >
          <Plus size={13} /> Ajouter une zone
        </button>
      </div>

      {/* Bandeau de couverture — la raison d'être de cet écran. */}
      <CoverageBanner
        gaps={gaps}
        total={coverage.totalQuartiers}
        uncovered={coverage.uncovered}
        fallbackFee={coverage.fallbackFee}
        mode={deliveryPriceMode}
      />

      {creating && (
        <ZoneForm
          vendorId={vendorId}
          token={token}
          onClose={() => setCreating(false)}
        />
      )}

      {zones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
          Aucune zone. En mode « par zone », toutes les livraisons seraient
          facturées {fmt(coverage.fallbackFee)}.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-dark-border">
          {zones.map((zone) =>
            editingId === zone.id ? (
              <div key={zone.id} className="py-3">
                <ZoneForm
                  vendorId={vendorId}
                  token={token}
                  zone={zone}
                  onClose={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={zone.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {zone.zoneName}
                    </span>
                    <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {fmt(zone.fee)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {zone.quartiers.length === 0
                      ? 'Aucun quartier — cette zone ne s’applique à personne.'
                      : zone.quartiers
                          .map((qz) => qz.quartier?.nom ?? qz.quartierId)
                          .join(', ')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setEditingId(zone.id);
                    }}
                    title="Modifier"
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(zone)}
                    disabled={remove.isPending}
                    title="Supprimer"
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * « X quartiers sur Y seront facturés au tarif de repli. »
 *
 * Affiché dans les **deux** modes, à dessein : en `FIXED`, il montre ce que
 * coûterait la bascule avant de la faire, au lieu de laisser découvrir le trou
 * après. Le ton change, pas la donnée — une information neutre quand elle ne
 * s'applique pas encore, une alerte quand elle facture déjà.
 */
function CoverageBanner({
  gaps,
  total,
  uncovered,
  fallbackFee,
  mode,
}: {
  gaps: number;
  total: number;
  uncovered: { id: string; nom: string }[];
  fallbackFee: number;
  mode: DeliveryPriceMode;
}) {
  const active = mode === 'ZONE_BASED';

  if (gaps === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
        <Check size={13} className="shrink-0" />
        Les {total} quartiers du référentiel sont couverts par une zone.
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-xs ${
        active
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
      }`}
    >
      <p className="flex items-start gap-2 font-medium">
        {active ? (
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        ) : (
          <MapPin size={13} className="mt-0.5 shrink-0" />
        )}
        <span>
          {gaps} quartier{gaps > 1 ? 's' : ''} sur {total}{' '}
          {active ? 'sont facturés' : 'seraient facturés'} au tarif de repli de{' '}
          {fmt(fallbackFee)}.
        </span>
      </p>
      <p className="mt-1.5 pl-5 leading-relaxed opacity-90">
        {uncovered.map((q) => q.nom).join(' · ')}
      </p>
    </div>
  );
}

// ─── Formulaire de zone ──────────────────────────────────────────────────────

function ZoneForm({
  vendorId,
  token,
  zone,
  onClose,
}: {
  vendorId: string;
  token: string | null;
  zone?: DeliveryZone;
  onClose: () => void;
}) {
  const { data: quartiers = [] } = useQuartiers();
  const create = useCreateDeliveryZone(token, vendorId);
  const update = useUpdateDeliveryZone(token, vendorId);

  const [name, setName] = useState(zone?.zoneName ?? '');
  const [fee, setFee] = useState(zone ? String(zone.fee) : '');
  const [selected, setSelected] = useState<string[]>(
    zone?.quartiers.map((qz) => qz.quartierId) ?? [],
  );

  const saving = create.isPending || update.isPending;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (!name.trim()) {
      toast.error('Donnez un nom à la zone');
      return;
    }
    const feeValue = Number(fee);
    if (fee.trim() === '' || !Number.isInteger(feeValue) || feeValue < 0) {
      toast.error('Le tarif doit être un entier de FCFA, sans décimale');
      return;
    }
    try {
      if (zone) {
        await update.mutateAsync({
          zoneId: zone.id,
          zoneName: name.trim(),
          fee: feeValue,
          quartierIds: selected,
        });
        toast.success('Zone mise à jour');
      } else {
        await create.mutateAsync({
          zoneName: name.trim(),
          fee: feeValue,
          quartierIds: selected,
        });
        toast.success('Zone créée');
      }
      onClose();
    } catch (e) {
      toast.error(apiMessage(e, 'Enregistrement impossible'));
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom de la zone">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zone Centre"
            className={inputCls}
          />
        </Field>
        <Field label="Tarif (FCFA)">
          <input
            type="number"
            min="0"
            step="1"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="500"
            className={inputCls}
          />
        </Field>
      </div>

      <div>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">
          Quartiers couverts ({selected.length})
        </span>
        {/* Une zone sans quartier est acceptée par le serveur mais ne
            s'applique à personne : on le dit plutôt que de la refuser — elle
            peut être créée puis remplie. */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quartiers.map((q) => {
            const on = selected.includes(q.id);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => toggle(q.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {q.nom}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300"
        >
          <X size={13} /> Annuler
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : zone ? 'Mettre à jour' : 'Créer la zone'}
        </button>
      </div>
    </div>
  );
}

// ─── Primitives locales ──────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <span className="mt-1 block text-[11px] text-zinc-400">{hint}</span>
      )}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-primary-500 focus:ring-primary-500/40"
      />
      {label}
    </label>
  );
}
