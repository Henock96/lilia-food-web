'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@lilia/utils';
import { analytics } from '@/lib/analytics';
import { catalogueHref, type CatalogueParams, type TypeFilter } from '@/lib/vendor-catalog';

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Recherche et filtres du catalogue.
 *
 * Ce composant ne filtre rien lui-même : il écrit l'URL, et la page serveur
 * relit le catalogue avec les filtres du **serveur** (`vendorType`, `isOpen`).
 * L'ancienne version filtrait en mémoire les 50 premiers vendeurs.
 *
 * - Puces et bascule portent `aria-pressed` : leur état n'était porté que par
 *   la couleur.
 * - Seuls les univers qui ont des vendeurs sont proposés, avec leur compte.
 * - « Ouverts maintenant » est dans l'URL (`?ouvert=1`) : il se perdait au
 *   partage et au retour arrière.
 */
export function CatalogueControls({
  params,
  typeFilters,
  openCount,
}: {
  params: CatalogueParams;
  typeFilters: TypeFilter[];
  /** `null` : compteur indisponible (le filtre reste utilisable). */
  openCount: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(params.q);
  // Dernière recherche envoyée PAR CE CHAMP. Sert à distinguer l'arrivée de
  // notre propre recherche (ne pas toucher au champ : la personne a peut-être
  // continué à taper pendant le chargement) d'un changement venu d'ailleurs
  // (retour arrière, lien partagé), qui doit, lui, réécrire le champ.
  const [sentQ, setSentQ] = useState<string | null>(null);

  // Mise à jour pendant le rendu, pas dans un effet.
  const [syncedQ, setSyncedQ] = useState(params.q);
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    if (params.q !== sentQ) setText(params.q);
  }

  function go(change: Partial<CatalogueParams>, mode: 'push' | 'replace' = 'push') {
    const href = catalogueHref(params, change);
    if (change.q !== undefined) setSentQ(change.q);
    startTransition(() => {
      if (mode === 'replace') router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  // Recherche à la frappe, temporisée : une requête de rendu par pause, pas
  // par touche. `replace` pour ne pas empiler une entrée d'historique par mot.
  //
  // Le minuteur dépend de TOUS les filtres, pas seulement de `q` : sinon un
  // filtre cliqué pendant la temporisation était défait quand le minuteur,
  // armé avec les anciens paramètres, partait (« pou » + clic « Boulangeries »
  // → `/restaurants?q=pou`, filtre perdu).
  useEffect(() => {
    const q = text.trim();
    if (q === params.q) return;
    const id = setTimeout(() => go({ q }, 'replace'), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // `go` lit `params` : ses trois champs filtrants sont listés ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, params.q, params.vendorType, params.openOnly]);

  function selectType(type: TypeFilter['type'] | null) {
    // Quels univers les visiteurs réclament : l'information la plus utile
    // pour savoir quels vendeurs recruter.
    analytics.track('category_filter', { vendor_type: type ?? 'ALL' });
    go({ vendorType: type });
  }

  return (
    <div className="mt-6 flex flex-col gap-3" aria-busy={pending}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: text.trim() }, 'replace');
        }}
        className="relative"
      >
        <label htmlFor="catalogue-recherche" className="sr-only">
          Rechercher un vendeur, une spécialité ou un quartier
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden
        />
        <input
          id="catalogue-recherche"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Un vendeur, une spécialité, un quartier…"
          className="min-h-12 w-full rounded-xl border border-cream-300 bg-white py-3 pl-11 pr-12 text-base text-ink-900 placeholder:text-ink-500 transition-colors focus:border-tomato-600 focus:outline-none focus:ring-2 focus:ring-tomato-100 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('');
              go({ q: '' }, 'replace');
            }}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 transition-colors hover:text-ink-900"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les vendeurs">
        <Chip active={params.vendorType === null} onClick={() => selectType(null)}>
          Tous
        </Chip>
        {typeFilters.map((f) => (
          <Chip key={f.type} active={params.vendorType === f.type} onClick={() => selectType(f.type)}>
            {f.label}
            <Count active={params.vendorType === f.type}>{f.count}</Count>
          </Chip>
        ))}

        <span aria-hidden className="mx-1 hidden h-6 w-px bg-cream-300 sm:block" />

        <Chip
          active={params.openOnly}
          tone="success"
          onClick={() => go({ openOnly: !params.openOnly })}
        >
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 rounded-full',
              params.openOnly ? 'bg-white' : 'bg-success',
            )}
          />
          Ouverts maintenant
          {openCount !== null && <Count active={params.openOnly}>{openCount}</Count>}
        </Chip>
      </div>

      <p className="sr-only" aria-live="polite">
        {pending ? 'Mise à jour des résultats…' : ''}
      </p>
    </div>
  );
}

function Chip({
  active,
  tone = 'brand',
  onClick,
  children,
}: {
  active: boolean;
  tone?: 'brand' | 'success';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] px-4 text-sm font-semibold transition-colors',
        active
          ? tone === 'success'
            ? 'border-success bg-success text-white'
            : 'border-tomato-600 bg-tomato-600 text-white'
          : 'border-cream-300 bg-white text-ink-700 hover:border-tomato-600 hover:text-tomato-700',
      )}
    >
      {children}
    </button>
  );
}

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('text-xs font-medium', active ? 'text-white' : 'text-ink-500')}>
      {children}
    </span>
  );
}
