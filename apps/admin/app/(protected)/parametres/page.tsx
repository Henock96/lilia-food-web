'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ApiError, usePlatformSettings, useUpdatePlatformSettings } from '@lilia/api-client';
import type { PlatformSettings } from '@lilia/types';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  NUMBER_FIELD_SPECS,
  type NumberFieldKey,
  type SettingsForm,
  appUpdateStatus,
  buildSettingsPatch,
  toSettingsForm,
} from '@/lib/platform-settings-form';
import { BLOCK_CONFIRMATION_WORD, requiresBlockConfirmation } from '@/lib/app-update-rules';

/** Champs numériques, par section, avec l'avertissement des réglages sensibles. */
const NUMBER_FIELDS: {
  key: NumberFieldKey;
  suffix: string;
  section: string;
  /** Avertissement affiché sous le champ, pour les réglages à effet rétroactif. */
  warning?: string;
}[] = [
  { key: 'serviceFeePercent', suffix: '%', section: 'Frais de service' },
  {
    key: 'restaurantCommissionPercent',
    suffix: '%',
    section: 'Commission vendeur',
    // Ce champ n'était éditable par AUCUNE interface : absent du DTO serveur,
    // il était silencieusement retiré des requêtes (whitelist), qui
    // répondaient 200 sans rien changer. Le mettre à 0 imposait du SQL direct.
    warning:
      "Retenue sur le vendeur au reversement — le client ne la paie pas (à ne pas confondre avec les frais de service). N'affecte que les commandes futures : le taux est figé sur chaque commande à sa création. Un taux propre à un vendeur, défini sur sa fiche, prime sur celui-ci.",
  },
  { key: 'loyaltyPointsPerOrder', suffix: 'pts', section: 'Fidélité' },
  {
    key: 'loyaltyPointValueXaf',
    suffix: 'XAF',
    section: 'Fidélité',
    // Le seul champ de cet écran dont la modification a un effet RÉTROACTIF :
    // la valeur est lue au moment de la dépense, jamais figée à l'acquisition.
    warning:
      'Effet rétroactif : ce montant revalorise tous les points déjà distribués. Ne pas modifier sans exécuter la procédure de redénomination (docs/LOYALTY.md).',
  },
  { key: 'loyaltyMinRedemption', suffix: 'pts', section: 'Fidélité' },
  { key: 'referrerBonusPoints', suffix: 'pts', section: 'Parrainage' },
];
const SECTIONS = ['Frais de service', 'Commission vendeur', 'Fidélité', 'Parrainage'];

const INPUT =
  'w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500';
const CARD =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';

export default function ParametresPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError, refetch } = usePlatformSettings(token);
  const update = useUpdatePlatformSettings(token);

  /**
   * Configuration **telle que le formulaire l'a chargée** : base du diff et
   * du verrou optimiste. Distincte de `data`, qui peut être rafraîchie en
   * arrière-plan — on ne veut ni écraser la saisie en cours, ni envoyer un
   * `expectedUpdatedAt` que l'administrateur n'a jamais vu.
   */
  const [loaded, setLoaded] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);

  // Hydratation unique, pendant le rendu (et non dans un effet) : c'est le
  // motif React pour dériver un état d'une donnée arrivée — pas de rendu
  // intermédiaire vide, pas de setState en cascade dans un effet.
  if (data && !loaded) {
    setLoaded(data);
    setForm(toSettingsForm(data));
  }

  if (isError && !form) {
    return <p className="text-sm text-red-500">Impossible de charger la configuration.</p>;
  }
  if (isLoading || !form || !loaded) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  /** La configuration a-t-elle bougé ailleurs depuis le chargement ? */
  const staleElsewhere = !!data && data.updatedAt !== loaded.updatedAt;

  function reloadFromServer(fresh: PlatformSettings) {
    setLoaded(fresh);
    setForm(toSettingsForm(fresh));
    setErrors([]);
    setConflict(false);
  }

  async function handleReload() {
    const { data: fresh } = await refetch();
    if (fresh) reloadFromServer(fresh);
  }

  function handleSave() {
    if (!form || !loaded || update.isPending) return;
    const result = buildSettingsPatch(form, loaded);
    if (!result.ok) {
      setErrors(result.errors);
      toast.error('Configuration non enregistrée : corrigez les champs signalés.');
      return;
    }
    setErrors([]);
    if (!result.changed) {
      toast.info('Aucune modification à enregistrer.');
      return;
    }
    // F3-02 — la bascule change le prix de toutes les prochaines commandes et
    // l'assiette de la paie des livreurs : on la fait confirmer.
    if (
      result.patch.deliveryPricingMode &&
      !window.confirm(
        result.patch.deliveryPricingMode === 'PLATFORM'
          ? 'Passer la livraison en tarification plateforme ?\n\nLe prix de chaque course viendra de la grille publiée ; les tarifs et zones des vendeurs ne fixeront plus de prix.'
          : 'Revenir aux prix fixés par les vendeurs ?\n\nLa grille plateforme cessera de s’appliquer aux prochaines commandes.',
      )
    ) {
      return;
    }
    update.mutate(result.patch, {
      onSuccess: (saved) => {
        reloadFromServer(saved);
        toast.success('Configuration enregistrée');
      },
      onError: (e) => {
        if (e instanceof ApiError && e.status === 409) {
          setConflict(true);
          toast.error('Un autre administrateur a modifié la configuration entre-temps.');
          return;
        }
        toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
      },
    });
  }

  const status = appUpdateStatus(loaded);
  const needsBlockConfirmation = requiresBlockConfirmation(form.minAppVersion, loaded.minAppVersion);

  return (
    <div className="max-w-2xl space-y-4">
      {(conflict || staleElsewhere) && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4"
        >
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            {conflict
              ? "Vos changements n'ont pas été enregistrés : la configuration a été modifiée par un autre administrateur depuis que vous l'avez ouverte."
              : 'La configuration a été modifiée ailleurs depuis que vous avez ouvert cette page.'}{' '}
            Rechargez pour voir les valeurs actuelles, puis refaites vos changements.
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          >
            <RefreshCw size={14} /> Recharger
          </button>
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section} className={CARD}>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{section}</h3>
          <div className="space-y-3">
            {NUMBER_FIELDS.filter((f) => f.section === section).map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={f.key} className="text-sm text-zinc-600 dark:text-zinc-300">
                    {NUMBER_FIELD_SPECS[f.key].label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={f.key}
                      type="text"
                      inputMode={NUMBER_FIELD_SPECS[f.key].integer ? 'numeric' : 'decimal'}
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-sm text-right rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary-500 tabular-nums"
                    />
                    <span className="text-xs text-zinc-400 w-8">{f.suffix}</span>
                  </div>
                </div>
                {f.warning && (
                  <p className="mt-1 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                    ⚠️ {f.warning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tarification de la livraison (F3-02) */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Tarification de la livraison
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
          En mode plateforme, le prix vient de la{' '}
          <Link href="/tarifs-livraison" className="text-primary-600 hover:underline dark:text-primary-400">
            grille publiée
          </Link>{' '}
          ; le vendeur peut seulement offrir une part de la livraison. Le retour au mode
          vendeur reste toujours possible.
        </p>
        <div className="space-y-2">
          {(
            [
              ['VENDOR_LEGACY', 'Prix fixés par chaque vendeur'],
              ['PLATFORM', 'Grille plateforme'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="deliveryPricingMode"
                checked={form.deliveryPricingMode === value}
                onChange={() => set('deliveryPricingMode', value)}
                className="accent-primary-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Maintenance */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Maintenance</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              Mode maintenance (bloque les nouvelles commandes, le catalogue reste visible)
            </span>
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.checked)}
              className="w-4 h-4 accent-primary-500"
            />
          </label>
          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-300 block mb-1">Message affiché au client</label>
            <input
              type="text"
              value={form.maintenanceMessage}
              onChange={(e) => set('maintenanceMessage', e.target.value)}
              placeholder="La plateforme est en maintenance…"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Mise à jour de l'application */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Mise à jour de l&apos;application
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
          Réglages de l&apos;application mobile cliente. Vider un champ efface la valeur.
        </p>

        <AppUpdateStatusPanel status={status} />

        <div className="space-y-3 mt-4">
          <Field label="Dernière version publiée" hint="Sous cette version, invitation reportable (24 h).">
            <input
              type="text"
              value={form.latestAppVersion}
              onChange={(e) => set('latestAppVersion', e.target.value)}
              placeholder="1.3.0 ou 1.3.0+34"
              className={INPUT}
            />
          </Field>
          <Field label="Message affiché au client" hint={`${form.updateMessage.trim().length}/300`}>
            <input
              type="text"
              maxLength={300}
              value={form.updateMessage}
              onChange={(e) => set('updateMessage', e.target.value)}
              placeholder="Nouveautés du panier…"
              className={INPUT}
            />
          </Field>
          <Field label="URL Android" hint="Fiche Google Play de Lilia Food. Vide = lien compilé dans l'app.">
            <input
              type="url"
              value={form.updateUrlAndroid}
              onChange={(e) => set('updateUrlAndroid', e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=com.dreesis.lilia.lilia_app"
              className={INPUT}
            />
          </Field>
          <Field label="URL iOS" hint="Fiche App Store (…/id<chiffres>). Vide = recherche « Lilia Food » dans l'App Store.">
            <input
              type="url"
              value={form.updateUrlIos}
              onChange={(e) => set('updateUrlIos', e.target.value)}
              placeholder="https://apps.apple.com/app/lilia-food/id…"
              className={INPUT}
            />
          </Field>

          <UserPreview form={form} />

          <div className="rounded-xl border border-red-200 dark:border-red-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                Blocage du parc (avancé)
              </span>
            </div>
            <p className="text-[11px] leading-snug text-red-700/80 dark:text-red-300/80">
              En dessous de cette version, les clients ne peuvent plus commander. Réservé à une faille de sécurité ou
              une rupture de contrat d&apos;API. Pour pousser une nouveauté, utilisez « Dernière version publiée ».
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Version minimale"
                value={form.minAppVersion}
                onChange={(e) => set('minAppVersion', e.target.value)}
                placeholder="vide = aucun blocage"
                className={INPUT}
              />
              {loaded.minAppVersion && (
                <button
                  type="button"
                  onClick={() => set('minAppVersion', '')}
                  className="shrink-0 text-xs font-medium px-3 rounded-lg border border-zinc-300 dark:border-dark-border text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Lever le blocage
                </button>
              )}
            </div>
            {needsBlockConfirmation && (
              <Field label={`Tapez ${BLOCK_CONFIRMATION_WORD} pour confirmer le blocage`}>
                <input
                  type="text"
                  value={form.blockConfirmation}
                  onChange={(e) => set('blockConfirmation', e.target.value)}
                  placeholder={BLOCK_CONFIRMATION_WORD}
                  className={INPUT}
                />
              </Field>
            )}
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 space-y-1">
          {errors.map((e) => (
            <li key={e} className="text-sm text-red-700 dark:text-red-300">
              {e}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={update.isPending || conflict}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

/** Ce que l'utilisateur lira, et où le bouton l'enverra — d'après la saisie. */
function UserPreview({ form }: { form: SettingsForm }) {
  const message = form.updateMessage.trim() || 'Message par défaut de l’application.';
  const android = form.updateUrlAndroid.trim() || 'Fiche Google Play compilée dans l’app (com.dreesis.lilia.lilia_app)';
  const ios = form.updateUrlIos.trim() || 'Recherche « Lilia Food » dans l’App Store (l’app n’a pas encore de fiche iOS)';
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">
      <p className="font-medium text-zinc-800 dark:text-zinc-100 mb-1">Ce que verra l&apos;utilisateur</p>
      <p>« {message} »</p>
      <p className="mt-1 break-all">
        Android → {android}
        <br />
        iOS → {ios}
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-300">{label}</label>
        {hint && <span className="text-[11px] text-zinc-400 text-right">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Ce qui est **actuellement** imposé en production — lu sur la configuration
 * chargée, jamais sur la saisie en cours.
 */
function AppUpdateStatusPanel({ status }: { status: ReturnType<typeof appUpdateStatus> }) {
  if (status.kind === 'blocking') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 p-3">
        <ShieldAlert size={16} className="text-red-600 mt-0.5 shrink-0" />
        <p className="text-sm text-red-800 dark:text-red-200">
          <strong>Blocage actif</strong> — version minimale : {status.minVersion}. Les applications plus anciennes
          (qui connaissent ce mécanisme) ne peuvent plus commander.
        </p>
      </div>
    );
  }
  if (status.kind === 'recommending') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3">
        <Sparkles size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Mise à jour recommandée</strong> — dernière version : {status.latestVersion}. Aucun blocage.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3">
      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
      <p className="text-sm text-emerald-800 dark:text-emerald-200">
        <strong>Aucun blocage</strong> — aucune mise à jour n&apos;est proposée.
      </p>
    </div>
  );
}
