'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Pencil, Power, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActivateDriver,
  useAdminDriver,
  useDeactivateDriver,
  useResendDriverInvitation,
  useUpdateDriver,
} from '@lilia/api-client';
import type { UpdateDriverDto, VehicleType } from '@lilia/types';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AccountBadge,
  AvailabilityBadge,
  ProfileBadge,
  VEHICLES_WITH_PLATE,
  VEHICLE_LABELS,
} from './driver-status-badges';

/**
 * Carte « compte et profil professionnel » d'un livreur.
 *
 * Elle sépare volontairement trois blocs — **Compte**, **Profil
 * professionnel**, **Activité** — parce que ce sont trois responsabilités
 * distinctes, avec trois décideurs différents. Les présenter comme un seul
 * « statut » a été le défaut de l'application livreur, qui affichait « Statut
 * compte : Actif » écrit en dur, y compris pour un compte suspendu.
 */
export function DriverProfileCard({ driverId }: { driverId: string }) {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = useAdminDriver(token, driverId);
  const activate = useActivateDriver(token);
  const deactivate = useDeactivateDriver(token);
  const resend = useResendDriverInvitation(token);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (isError || !data) return null;

  const profile = data.driverProfile;

  async function handleActivate() {
    try {
      await activate.mutateAsync(driverId);
      toast.success('Livreur activé — il peut recevoir des courses.');
    } catch (err) {
      // Le serveur refuse si le compte est suspendu. Afficher son message
      // plutôt qu'un « erreur » générique : il dit quoi faire.
      toast.error((err as Error).message);
    }
  }

  async function handleDeactivate() {
    const reason = window.prompt(
      'Motif de la désactivation (facultatif) — il sera conservé sur la fiche.',
    );
    if (reason === null) return; // annulé
    try {
      await deactivate.mutateAsync({ id: driverId, reason: reason || undefined });
      toast.success('Livreur retiré de la file d’assignation.');
    } catch (err) {
      // Refusé s'il a une course en cours : le message nomme la commande.
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Compte ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card dark:border-dark-border dark:bg-dark-card">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Compte
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="Nom" value={data.nom ?? '—'} />
          <Row label="E-mail" value={data.email} />
          <Row label="Téléphone" value={data.phone ?? '—'} />
          <Row
            label="Dernière connexion"
            value={
              data.lastLogin
                ? new Date(data.lastLogin).toLocaleString('fr-FR')
                : 'Jamais'
            }
          />
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AccountBadge status={data.statusUser} />
          <button
            onClick={async () => {
              try {
                const r = await resend.mutateAsync(driverId);
                toast[r.emailSent ? 'success' : 'warning'](r.detail);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
            disabled={resend.isPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-dark-border dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {resend.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            Renvoyer l&apos;invitation
          </button>
        </div>
      </section>

      {/* ─── Profil professionnel ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card dark:border-dark-border dark:bg-dark-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Profil professionnel
          </h2>
          {profile && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-500 transition-colors hover:text-primary-600"
            >
              <Pencil size={13} />
              Modifier
            </button>
          )}
        </div>

        {!profile ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Ce compte porte le rôle LIVREUR sans profil métier. Il ne peut
              recevoir aucune course tant qu&apos;un profil n&apos;a pas été créé.
            </p>
          </div>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row label="Véhicule" value={VEHICLE_LABELS[profile.vehicleType]} />
              <Row label="Immatriculation" value={profile.plateNumber ?? '—'} />
              <Row label="Permis" value={profile.licenseNumber ?? '—'} />
              <Row
                label="Expiration du permis"
                value={
                  profile.licenseExpiry
                    ? new Date(profile.licenseExpiry).toLocaleDateString('fr-FR')
                    : '—'
                }
              />
              <Row
                label="Zones"
                value={
                  profile.zones.length
                    ? profile.zones.map((z) => z.nom).join(', ')
                    : 'Toute la ville'
                }
              />
              <Row
                label="Activé le"
                value={
                  profile.activatedAt
                    ? new Date(profile.activatedAt).toLocaleDateString('fr-FR')
                    : '—'
                }
              />
            </dl>

            {!profile.isActive && profile.deactivationReason && (
              <p className="mt-3 text-xs text-zinc-500">
                Motif de la désactivation :{' '}
                <span className="text-zinc-700 dark:text-zinc-300">
                  {profile.deactivationReason}
                </span>
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-dark-border">
              <ProfileBadge isActive={profile.isActive} />
              {profile.isActive ? (
                <button
                  onClick={handleDeactivate}
                  disabled={deactivate.isPending}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {deactivate.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Power size={13} />
                  )}
                  Désactiver
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={activate.isPending}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                  {activate.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Power size={13} />
                  )}
                  Activer
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ─── Activité ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card dark:border-dark-border dark:bg-dark-card">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Activité
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AvailabilityBadge status={data.driverStatus} />
          <span className="text-xs text-zinc-400">
            {data.activity.lastDeliveryAt
              ? `Dernière livraison le ${new Date(data.activity.lastDeliveryAt).toLocaleDateString('fr-FR')}`
              : 'Aucune livraison terminée'}
          </span>
          {data.activity.totalRatings > 0 && (
            <span className="text-xs text-zinc-400">
              · {data.activity.averageRating?.toFixed(1)} ★ (
              {data.activity.totalRatings} avis)
            </span>
          )}
        </div>

        {data.activity.activeDeliveries.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune course en cours.</p>
        ) : (
          <ul className="space-y-2">
            {data.activity.activeDeliveries.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {d.order?.restaurant.nom ?? 'Commande'} · {d.orderId.slice(-6)}
                </span>
                <span className="text-xs font-medium text-orange-500">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && profile && (
        <EditDriverModal
          driverId={driverId}
          initial={{
            nom: data.nom ?? '',
            phone: data.phone ?? '',
            vehicleType: profile.vehicleType,
            plateNumber: profile.plateNumber ?? '',
            licenseNumber: profile.licenseNumber ?? '',
            licenseExpiry: profile.licenseExpiry?.slice(0, 10) ?? '',
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="truncate text-sm text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}

function EditDriverModal({
  driverId,
  initial,
  onClose,
}: {
  driverId: string;
  initial: {
    nom: string;
    phone: string;
    vehicleType: VehicleType;
    plateNumber: string;
    licenseNumber: string;
    licenseExpiry: string;
  };
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const update = useUpdateDriver(token);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const needsPlate = VEHICLES_WITH_PLATE.includes(form.vehicleType);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dto: UpdateDriverDto = {
      nom: form.nom,
      phone: form.phone,
      vehicleType: form.vehicleType,
      // Le serveur refuse une plaque sur un vélo et son absence sur une moto :
      // on envoie une chaîne vide plutôt qu'`undefined` pour effacer la valeur
      // quand le véhicule change et n'en porte plus.
      plateNumber: needsPlate ? form.plateNumber.trim() : '',
      licenseNumber: form.licenseNumber.trim(),
      licenseExpiry: form.licenseExpiry
        ? `${form.licenseExpiry}T00:00:00.000Z`
        : undefined,
    };
    try {
      await update.mutateAsync({ id: driverId, dto });
      toast.success('Profil mis à jour.');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const input =
    'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-border dark:bg-dark-surface dark:text-zinc-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-card"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Modifier le livreur
          </h3>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nom
          </span>
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className={input}
            required
            minLength={2}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Téléphone
          </span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={input}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Véhicule
            </span>
            <select
              value={form.vehicleType}
              onChange={(e) =>
                setForm({ ...form, vehicleType: e.target.value as VehicleType })
              }
              className={input}
            >
              {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_LABELS[v]}
                </option>
              ))}
            </select>
          </label>

          {needsPlate && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Immatriculation
              </span>
              <input
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                className={input}
                required
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Permis
            </span>
            <input
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Expiration
            </span>
            <input
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
              className={input}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 dark:border-dark-border dark:text-zinc-300"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {update.isPending && <Loader2 size={15} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
