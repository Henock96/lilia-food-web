'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Restaurant, VendorType } from '@lilia/types';
import { RestaurantGrid } from './restaurant-grid';
import { VendorTypeChips } from './vendor-type-chips';

interface RestaurantsFiltersProps {
  restaurants: Restaurant[];
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

export function RestaurantsFilters({ restaurants }: RestaurantsFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [vendorType, setVendorType] = useState<VendorType | null>(() =>
    parseVendorType(searchParams.get('vendorType')),
  );

  // Sync URL → state when navigating back/forward
  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
    setVendorType(parseVendorType(searchParams.get('vendorType')));
  }, [searchParams]);

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
      // LIL-119 : marketplace filter. Si vendorType absent côté restaurant
      // (vieux payload pré-Sprint A), traite-le comme RESTAURANT par défaut.
      const matchesVendorType =
        !vendorType || (r.vendorType ?? 'RESTAURANT') === vendorType;
      return matchesSearch && matchesOpen && matchesVendorType;
    });
  }, [restaurants, search, showOpenOnly, vendorType]);

  return (
    <>
      {/* Chips marketplace (LIL-119) */}
      <div className="mb-4 -mx-1 overflow-x-auto pb-1">
        <div className="px-1">
          <VendorTypeChips selected={vendorType} onChange={updateVendorType} />
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Rechercher un restaurant ou une cuisine..."
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowOpenOnly((v) => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
            showOpenOnly
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${showOpenOnly ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
          Ouverts maintenant
        </button>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 dark:text-zinc-600">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-zinc-600 dark:text-zinc-400">Aucun résultat pour "{search}"</p>
          <p className="text-sm mt-1">Essayez une autre recherche</p>
        </div>
      ) : (
        <>
          {(search || showOpenOnly) && (
            <p className="text-sm text-zinc-500 mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
          )}
          <RestaurantGrid restaurants={filtered} />
        </>
      )}
    </>
  );
}
