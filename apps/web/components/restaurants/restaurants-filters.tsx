'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { Restaurant, VendorType } from '@lilia/types';
import { VendorGrid } from './vendor-grid';
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
      const matchesVendorType =
        !vendorType || (r.vendorType ?? 'RESTAURANT') === vendorType;
      return matchesSearch && matchesOpen && matchesVendorType;
    });
  }, [restaurants, search, showOpenOnly, vendorType]);

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
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Rechercher un vendeur, une cuisine, un plat…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/35 transition-all focus:border-[var(--ember-400)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--ember-500)]/20"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowOpenOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
            showOpenOnly
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:text-white'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${showOpenOnly ? 'bg-emerald-400' : 'bg-white/30'}`} />
          Ouverts maintenant
        </button>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/8 bg-white/[0.02] py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-white/20" />
          <p className="font-semibold text-white">
            {search ? `Aucun résultat pour « ${search} »` : 'Aucun vendeur pour ce filtre'}
          </p>
          <p className="mt-1 text-sm text-white/45">Essaie une autre recherche ou un autre type.</p>
        </div>
      ) : (
        <>
          {(search || showOpenOnly) && (
            <p className="mb-4 text-sm text-white/45">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </p>
          )}
          <VendorGrid restaurants={filtered} />
        </>
      )}
    </>
  );
}
