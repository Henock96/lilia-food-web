'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';
import { retryVendors } from '@/lib/actions/vendors';

/**
 * Échec de chargement du catalogue — distinct, visuellement et dans le texte,
 * de « aucun vendeur ». L'accueil rendait une panne comme un catalogue vide.
 *
 * `retryVendors()` invalide l'entrée de cache `vendors` avant le
 * `router.refresh()` : sans ça, le rafraîchissement pourrait resservir une
 * valeur mémorisée. `useTransition` garde le bouton désactivé pendant tout le
 * réveil éventuel du backend (30 à 60 s), pour éviter les clics en rafale.
 */
export function VendorsLoadError({ className }: { className?: string }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-3 rounded-xl border border-cream-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <div>
        <p className="font-semibold text-ink-900">Impossible de charger les vendeurs.</p>
        <p className="mt-0.5 text-sm text-ink-500">
          Le service met parfois quelques secondes à répondre.
        </p>
      </div>
      <button
        type="button"
        disabled={retrying}
        aria-busy={retrying}
        onClick={() =>
          startRetry(async () => {
            await retryVendors();
            router.refresh();
          })
        }
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border-[1.5px] border-tomato-600 px-5 text-sm font-semibold text-tomato-700 transition-colors hover:bg-tomato-50 disabled:cursor-not-allowed disabled:border-cream-300 disabled:text-ink-500"
      >
        <RotateCw className={`h-4 w-4 ${retrying ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
        {retrying ? 'Nouvel essai…' : 'Réessayer'}
      </button>
    </div>
  );
}
