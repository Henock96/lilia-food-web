'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlatformSettings, useUpdatePlatformSettings } from '@lilia/api-client';
import type { PlatformSettings } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/** Clés des champs numériques de la configuration. */
type NumberFieldKey =
  | 'serviceFeePercent'
  | 'loyaltyPointsPer100Xaf'
  | 'loyaltyPointValueXaf'
  | 'loyaltyMinRedemption'
  | 'referrerBonusPoints'
  | 'referredBonusPoints';

/** Champs numériques éditables : clé → libellé + suffixe. */
const NUMBER_FIELDS: { key: NumberFieldKey; label: string; suffix: string; section: string }[] = [
  { key: 'serviceFeePercent',      label: 'Frais de service',           suffix: '%',   section: 'Frais de service' },
  { key: 'loyaltyPointsPer100Xaf', label: 'Points gagnés / 100 XAF',    suffix: 'pts', section: 'Fidélité' },
  { key: 'loyaltyPointValueXaf',   label: "Valeur d'un point",          suffix: 'XAF', section: 'Fidélité' },
  { key: 'loyaltyMinRedemption',   label: "Seuil minimum d'usage",      suffix: 'pts', section: 'Fidélité' },
  { key: 'referrerBonusPoints',    label: 'Bonus parrain',              suffix: 'pts', section: 'Parrainage' },
  { key: 'referredBonusPoints',    label: 'Bonus filleul',              suffix: 'pts', section: 'Parrainage' },
];
const SECTIONS = ['Frais de service', 'Fidélité', 'Parrainage'];

/**
 * État local du formulaire. Les champs numériques sont stockés en **chaîne**
 * pendant l'édition (saisie libre, on peut vider un champ), et parsés en
 * nombre seulement à l'enregistrement.
 */
interface FormState {
  serviceFeePercent: string;
  loyaltyPointsPer100Xaf: string;
  loyaltyPointValueXaf: string;
  loyaltyMinRedemption: string;
  referrerBonusPoints: string;
  referredBonusPoints: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

function toFormState(s: PlatformSettings): FormState {
  return {
    serviceFeePercent: String(s.serviceFeePercent),
    loyaltyPointsPer100Xaf: String(s.loyaltyPointsPer100Xaf),
    loyaltyPointValueXaf: String(s.loyaltyPointValueXaf),
    loyaltyMinRedemption: String(s.loyaltyMinRedemption),
    referrerBonusPoints: String(s.referrerBonusPoints),
    referredBonusPoints: String(s.referredBonusPoints),
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage ?? '',
  };
}

export default function ParametresPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = usePlatformSettings(token);
  const update = useUpdatePlatformSettings(token);
  const [form, setForm] = useState<FormState | null>(null);
  // Le formulaire n'est hydraté qu'une seule fois — un refetch en arrière-plan
  // ne doit pas écraser les modifications en cours de l'admin.
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      setForm(toFormState(data));
      initialised.current = true;
    }
  }, [data]);

  if (isError) {
    return <p className="text-sm text-red-500">Impossible de charger la configuration.</p>;
  }
  if (isLoading || !form) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  function handleSave() {
    if (!form) return;
    update.mutate(
      {
        serviceFeePercent: Number(form.serviceFeePercent) || 0,
        loyaltyPointsPer100Xaf: Number(form.loyaltyPointsPer100Xaf) || 0,
        loyaltyPointValueXaf: Number(form.loyaltyPointValueXaf) || 0,
        loyaltyMinRedemption: Number(form.loyaltyMinRedemption) || 0,
        referrerBonusPoints: Number(form.referrerBonusPoints) || 0,
        referredBonusPoints: Number(form.referredBonusPoints) || 0,
        maintenanceMode: form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage,
      },
      {
        onSuccess: () => toast.success('Configuration enregistrée'),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement"),
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {SECTIONS.map((section) => (
        <div key={section} className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{section}</h3>
          <div className="space-y-3">
            {NUMBER_FIELDS.filter((f) => f.section === section).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => (prev ? { ...prev, [f.key]: e.target.value } : prev))}
                    className="w-24 px-2.5 py-1.5 text-sm text-right rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary-500 tabular-nums"
                  />
                  <span className="text-xs text-zinc-400 w-8">{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Maintenance */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Maintenance</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Mode maintenance (bloque les nouvelles commandes)</span>
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, maintenanceMode: e.target.checked } : prev))}
              className="w-4 h-4 accent-primary-500"
            />
          </label>
          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-300 block mb-1">Message affiché au client</label>
            <input
              type="text"
              value={form.maintenanceMessage}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, maintenanceMessage: e.target.value } : prev))}
              placeholder="La plateforme est en maintenance…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
