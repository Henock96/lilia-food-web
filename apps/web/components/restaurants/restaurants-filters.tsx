'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Restaurant, VendorType } from '@lilia/types';
import { VendorGrid } from './vendor-grid';
import { VendorTypeChips } from './vendor-type-chips';

interface RestaurantsFiltersProps {
  restaurants: Restaurant[];
  /** La requête `/vendors` a échoué côté serveur : on saute les filtres et on
   * délègue directement à `VendorGrid` son état d'échec + retry. */
  failed?: boolean;
}

const VALID_VENDOR_TYPES: VendorType[] = [
  'RESTAURANT',
  'HOME_COOK',
  'BAKERY',
  'BEVERAGE_SHOP',
  'GROCERY',
];

function parseVendorType(raw: string | null): VendorType | null {
  if (raw && (VALID_VENDOR_TYPES as string[]).includes(raw)) {
    return raw as VendorType;
  }
  return null;
}

export function RestaurantsFilters({ restaurants, failed = false }: RestaurantsFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [vendorType, setVendorType] = useState<VendorType | null>(() =>
    parseVendorType(searchParams.get('vendorType')),
  );

  // Resynchronise l'état avec l'URL quand elle change (nav arrière/avant) — reset pendant le render.
  const qParam = searchParams.get('q') ?? '';
  const vtRaw = searchParams.get('vendorType');
  const [prevQParam, setPrevQParam] = useState(qParam);
  const [prevVtRaw, setPrevVtRaw] = useState(vtRaw);
  if (qParam !== prevQParam || vtRaw !== prevVtRaw) {
    setPrevQParam(qParam);
    setPrevVtRaw(vtRaw);
    setSearch(qParam);
    setVendorType(parseVendorType(vtRaw));
  }

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function updateSearch(value: string) {
    setSearch(value);
    updateUrl({ q: value.trim() || null });
  }

  function updateVendorType(type: VendorType | null) {
    setVendorType(type);
    updateUrl({ vendorType: type });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return restaurants.filter((r) => {
      const matchesSearch =
        !q ||
        r.nom.toLowerCase().includes(q) ||
        r.adresse?.toLowerCase().includes(q) ||
        r.specialties?.some((s) => s.name.toLowerCase().includes(q));
      const matchesOpen = !showOpenOnly || r.isOpen;
      const matchesVendorType =
        !vendorType || (r.vendorType ?? 'RESTAURANT') === vendorType;
      return matchesSearch && matchesOpen && matchesVendorType;
    });
  }, [restaurants, search, showOpenOnly, vendorType]);

  // Pointillés « Prochain vendeur ici » uniquement sur la vue non filtrée —
  // sur un résultat de recherche/filtre, ça n'aurait pas de sens.
  const hasActiveFilter = Boolean(search.trim()) || showOpenOnly || vendorType !== null;

  if (failed) {
    return <VendorGrid restaurants={[]} failed />;
  }

  return (
    <>
      {/* Chips marketplace (LIL-119) */}
      <div className="-mx-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
        <div className="px-1">
          <VendorTypeChips selected={vendorType} onChange={updateVendorType} />
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Rechercher un vendeur, une cuisine, un plat…"
            className="w-full rounded-2xl border border-cream-300 bg-white py-3 pl-11 pr-10 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-100"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300 transition-colors hover:text-ink-700"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowOpenOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-2xl border-[1.5px] px-4 py-3 text-sm font-medium transition-colors ${
            showOpenOnly
              ? 'border-success bg-success/10 text-success'
              : 'border-cream-300 bg-white text-ink-700 hover:border-tomato-600 hover:text-tomato-600'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${showOpenOnly ? 'bg-success' : 'bg-ink-300'}`} />
          Ouverts maintenant
        </button>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-cream-300 bg-white py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-ink-300" />
          <p className="font-semibold text-ink-900">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun vendeur pour ce filtre'}
          </p>
          <p className="mt-1 text-sm text-ink-500">Essaie une autre recherche ou un autre type.</p>
        </div>
      ) : (
        <>
          {(search || showOpenOnly) && (
            <p className="mb-4 text-sm text-ink-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </p>
          )}
          <VendorGrid restaurants={filtered} minSlots={hasActiveFilter ? undefined : 4} />
        </>
      )}
    </>
  );
}
