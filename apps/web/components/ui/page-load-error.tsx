'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';

/**
 * Échec de chargement d'une fiche — distinct d'une fiche introuvable, comme
 * `VendorsLoadError` l'est d'un catalogue vide.
 *
 * `router.refresh()` suffit : cet écran ne s'affiche qu'après une lecture qui
 * a levé, et une rejection n'est jamais mise en cache. Il n'y a rien à purger
 * (SEC-06 : la purge publique qui précédait a été retirée).
 */
export function PageLoadError({ title }: { title: string }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-cream-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-semibold text-ink-900">{title}</p>
          <p className="mt-0.5 text-sm text-ink-500">
            Le service met parfois quelques secondes à répondre.
          </p>
        </div>
        <button
          type="button"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() =>
            startRetry(() => {
              router.refresh();
            })
          }
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border-[1.5px] border-tomato-600 px-5 text-sm font-semibold text-tomato-700 transition-colors hover:bg-tomato-50 disabled:cursor-not-allowed disabled:border-cream-300 disabled:text-ink-500"
        >
          <RotateCw className={`h-4 w-4 ${retrying ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
          {retrying ? 'Nouvel essai…' : 'Réessayer'}
        </button>
      </div>
    </div>
  );
}
