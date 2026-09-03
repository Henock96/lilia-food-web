'use client';

import { useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { useProfile, useUpdateProfile } from '@lilia/api-client';
import type { User } from '@lilia/types';

import { getFirebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Profil de l'utilisateur connecté du back-office.
 *
 * Le site client avait `/profil` depuis avril ; l'administration n'en avait
 * aucun. Un RESTAURATEUR connecté ici pouvait configurer sa boutique mais pas
 * corriger son propre nom ni son téléphone — alors que ce téléphone est celui
 * que le support rappelle.
 *
 * Le changement de mot de passe passe par le lien Firebase plutôt que par un
 * champ : c'est le même mécanisme que l'invitation, il ne demande pas de
 * transporter l'ancien secret, et il vérifie au passage que l'adresse e-mail
 * du compte est bien relevée.
 */
export default function ProfilPage() {
  const { token } = useAuthStore();
  const { data: profile, isLoading } = useProfile(token);

  if (isLoading || !profile) {
    return <Skeleton className="h-72 max-w-lg rounded-2xl" />;
  }

  // Le formulaire est un composant à part, monté seulement une fois le profil
  // chargé : il initialise donc son état depuis ses props, sans `useEffect` de
  // recopie — lequel déclencherait un rendu en cascade et n'aurait de toute
  // façon aucun état antérieur à corriger.
  return <ProfilForm profile={profile} token={token} />;
}

function ProfilForm({ profile, token }: { profile: User; token: string | null }) {
  const { user, setUser } = useAuthStore();
  const updateProfile = useUpdateProfile(token);

  const [nom, setNom] = useState(profile.nom ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [resetting, setResetting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      // `PUT /users/me` répond `{ message, user }`, wrappé par l'intercepteur
      // en `{ data: { message, user } }` — `apiClient` déballe `data`, il reste
      // donc l'enveloppe `{ user }`.
      const { user: updated } = await updateProfile.mutateAsync({
        nom: nom.trim(),
        phone: phone.trim(),
      });
      // Le store alimente la sidebar et le menu utilisateur : sans cette
      // remise à jour, le nom affiché resterait l'ancien jusqu'au prochain
      // rafraîchissement du token.
      if (user) setUser({ ...user, nom: updated.nom, phone: updated.phone });
      toast.success('Profil mis à jour.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handlePasswordReset() {
    if (!profile?.email) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), profile.email);
      toast.success(`Un lien de réinitialisation a été envoyé à ${profile.email}.`);
    } catch {
      toast.error("Impossible d'envoyer le lien. Réessayez dans un instant.");
    } finally {
      setResetting(false);
    }
  }

  const input =
    'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60 dark:border-dark-border dark:bg-dark-surface dark:text-zinc-100';

  return (
    <div className="max-w-lg space-y-4">
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-card dark:border-dark-border dark:bg-dark-card"
      >
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Mes informations
        </h1>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nom
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={80}
            className={input}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Téléphone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="061234567"
            className={input}
          />
          <span className="mt-1 block text-xs text-zinc-400">
            Format congolais, ex : 06 123 45 67
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Adresse e-mail
          </span>
          {/* Non modifiable : elle identifie le compte Firebase. La changer
              supposerait une re-vérification, ce qui est un autre chantier. */}
          <input value={profile.email} disabled className={input} />
        </label>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {profile.role}
          </span>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="ml-auto flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {updateProfile.isPending && <Loader2 size={15} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card dark:border-dark-border dark:bg-dark-card">
        <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Sécurité
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Vous recevrez un lien personnel, valable une seule fois, à l&apos;adresse
          du compte.
        </p>
        <button
          onClick={handlePasswordReset}
          disabled={resetting}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-dark-border dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {resetting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ShieldCheck size={15} />
          )}
          Changer mon mot de passe
        </button>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
          <Mail size={12} />
          {profile.email}
        </p>
      </section>
    </div>
  );
}
