'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDriver } from '@lilia/api-client';
import type { CreateDriverDto, VehicleType } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { VEHICLES_WITH_PLATE, VEHICLE_LABELS } from './driver-status-badges';

/**
 * Création d'un livreur.
 *
 * Le formulaire ne demande que ce qui sert : identité, moyen de contact et
 * véhicule. Le permis reste facultatif à la saisie — le rendre obligatoire ici
 * bloquerait la création d'un livreur à vélo, et l'administrateur peut le
 * compléter avant l'activation, qui est le moment où l'on vérifie les papiers.
 *
 * Aucun mot de passe n'est saisi : le compte naît avec un secret jetable et le
 * livreur définit le sien via un lien signé, envoyé par e-mail.
 */
export function CreateDriverPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore();
  const createDriver = useCreateDriver(token);

  const [form, setForm] = useState<CreateDriverDto>({
    email: '',
    nom: '',
    phone: '',
    vehicleType: 'MOTO',
    plateNumber: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string | null>(null);

  const needsPlate = VEHICLES_WITH_PLATE.includes(form.vehicleType);

  function set<K extends keyof CreateDriverDto>(k: K, v: CreateDriverDto[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const res = await createDriver.mutateAsync({
        ...form,
        // Une plaque n'a de sens que pour un engin qui en porte une. Le serveur
        // refuse l'incohérence ; ne pas l'envoyer évite un aller-retour.
        plateNumber: needsPlate ? form.plateNumber?.trim() || undefined : undefined,
        licenseNumber: form.licenseNumber?.trim() || undefined,
        licenseExpiry: form.licenseExpiry || undefined,
      });

      if (res.invitation && !res.invitation.emailSent) {
        // Repli assumé côté serveur : l'e-mail n'est pas parti, le lien est
        // remis à l'administrateur plutôt que de laisser le livreur sans accès.
        setActivationLink(res.invitation.activationLink ?? null);
        toast.warning(res.invitation.detail);
        return;
      }

      toast.success(`${form.nom} a été créé. Activez son profil après vérification des documents.`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-card">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Ajouter un livreur
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Il recevra un e-mail pour définir son mot de passe.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-zinc-400 transition-colors hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>

        {activationLink ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Le compte est créé, mais l&apos;e-mail n&apos;est pas parti.
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Transmettez ce lien au livreur par un canal sûr. Il est personnel
                et à usage unique.
              </p>
              <code className="mt-3 block break-all rounded-lg bg-white p-2 text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {activationLink}
              </code>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Terminé
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nom et prénom" required>
              <input
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="Jean Mabiala"
                className={INPUT}
              />
            </Field>

            <Field label="Adresse e-mail" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                placeholder="jean.mabiala@example.cg"
                className={INPUT}
              />
            </Field>

            <Field label="Téléphone" required hint="Format congolais, ex : 06 123 45 67">
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                required
                placeholder="061234567"
                className={INPUT}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Véhicule" required>
                <select
                  value={form.vehicleType}
                  onChange={(e) => set('vehicleType', e.target.value as VehicleType)}
                  className={INPUT}
                >
                  {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_LABELS[v]}
                    </option>
                  ))}
                </select>
              </Field>

              {needsPlate && (
                <Field label="Immatriculation" required>
                  <input
                    value={form.plateNumber ?? ''}
                    onChange={(e) => set('plateNumber', e.target.value)}
                    required
                    maxLength={20}
                    placeholder="BZV-1234"
                    className={INPUT}
                  />
                </Field>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Numéro de permis" hint="Facultatif">
                <input
                  value={form.licenseNumber ?? ''}
                  onChange={(e) => set('licenseNumber', e.target.value)}
                  maxLength={40}
                  className={INPUT}
                />
              </Field>
              <Field label="Expiration du permis" hint="Facultatif">
                <input
                  type="date"
                  value={form.licenseExpiry?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    set('licenseExpiry', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)
                  }
                  className={INPUT}
                />
              </Field>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <p className="text-xs text-zinc-500">
              Le profil sera créé <strong>inactif</strong> : activez-le une fois
              ses documents vérifiés. Tant qu&apos;il est inactif, aucune course
              ne peut lui être confiée.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-dark-border dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createDriver.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {createDriver.isPending && <Loader2 size={15} className="animate-spin" />}
                Créer le livreur
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-border dark:bg-dark-surface dark:text-zinc-100';

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}
