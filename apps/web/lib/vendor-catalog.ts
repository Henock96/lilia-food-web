import type { Restaurant, VendorType } from '@lilia/types';

/**
 * Catalogue public des vendeurs — fonctions pures, sans réseau.
 *
 * ## Le défaut que ce module ferme
 *
 * L'accueil demandait `GET /vendors?limit=4` parce que sa grille avait quatre
 * colonnes : une décision de **mise en page** devenue un paramètre de
 * **requête**. Le serveur appliquait `take: 4`, renvoyait `meta.total = 9`, et
 * le site jetait `meta` — cinq vendeurs sur neuf n'apparaissaient jamais, sans
 * que rien ne permette de le savoir. `/restaurants` portait la même erreur à
 * 50, sans pagination.
 *
 * Règle : **la grille décide de la disposition, jamais du nombre de vendeurs
 * demandés.** Les tailles de lot ci-dessous sont des choix de chargement
 * (combien de cartes servir d'un coup), indépendants du nombre de colonnes,
 * et `meta.total` est toujours conservé pour dire au client ce qui existe.
 */

/** Borne serveur de `limit` (`PaginationQueryDto`, `MAX_PAGE_SIZE`). */
export const SERVER_MAX_LIMIT = 100;

/** Cartes servies par l'accueil à chaque lot (« Afficher plus » ajoute un lot). */
export const SHOWCASE_BATCH = 12;

/**
 * Au-delà, l'accueil cesse de grandir et renvoie au catalogue : il reste une
 * vitrine, pas une liste exhaustive. Multiple du lot, sous la borne serveur.
 */
export const SHOWCASE_MAX = 96;

/** Cartes par page du catalogue `/restaurants`. */
export const CATALOGUE_PAGE_SIZE = 24;

/** Garde-fou du parcours complet : 20 pages × 100 = 2 000 vendeurs. */
export const MAX_COLLECTED_PAGES = 20;

export interface VendorPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VendorPage {
  vendors: Restaurant[];
  meta: VendorPageMeta;
}

export interface VendorQuery {
  page: number;
  limit: number;
  vendorType?: VendorType | null;
  isOpen?: boolean;
}

/** Réponse brute de `GET /vendors` (`{ data, meta }`). */
export interface RawVendorResponse {
  data?: Restaurant[];
  meta?: Partial<VendorPageMeta>;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Chemin `GET /vendors` : seuls les paramètres demandés partent. */
export function vendorsPath(query: VendorQuery): string {
  const params = new URLSearchParams({
    page: String(clampInt(query.page, 1, Number.MAX_SAFE_INTEGER)),
    limit: String(clampInt(query.limit, 1, SERVER_MAX_LIMIT)),
  });
  if (query.vendorType) params.set('vendorType', query.vendorType);
  if (query.isOpen) params.set('isOpen', 'true');
  return `/vendors?${params.toString()}`;
}

/**
 * Garde `data` **et** `meta`.
 *
 * Une réponse sans `meta.total` est refusée plutôt que complétée : le seul
 * total qu'on pourrait inventer est `data.length`, c'est-à-dire exactement le
 * mensonge qu'on corrige — une page présentée comme le catalogue entier. Le
 * serveur de production sert `meta` (vérifié le 08/10/2026) ; un échec ici
 * remonte comme une erreur de chargement, visible et réessayable.
 */
export function normalizeVendorPage(
  raw: RawVendorResponse,
  requested: { page: number; limit: number },
): VendorPage {
  if (!Array.isArray(raw?.data)) {
    throw new Error('Réponse /vendors invalide : `data` absent');
  }
  const total = raw.meta?.total;
  if (typeof total !== 'number' || !Number.isFinite(total)) {
    throw new Error('Réponse /vendors invalide : `meta.total` absent');
  }
  const limit = raw.meta?.limit ?? requested.limit;
  return {
    vendors: raw.data,
    meta: {
      page: raw.meta?.page ?? requested.page,
      limit,
      total,
      totalPages: raw.meta?.totalPages ?? Math.ceil(total / Math.max(1, limit)),
    },
  };
}

export interface CollectedVendors {
  vendors: Restaurant[];
  total: number;
  /** Le garde-fou a coupé le parcours : la liste n'est PAS complète. */
  truncated: boolean;
}

/**
 * Parcourt toutes les pages, dans l'ordre serveur.
 *
 * - **Une page en échec fait échouer le tout** : rendre les pages lues avant
 *   l'échec reviendrait à présenter un catalogue partiel comme complet.
 * - Un vendeur peut glisser d'une page à l'autre entre deux lectures (l'ordre
 *   serveur place les ouverts d'abord, et l'ouverture change chaque minute) :
 *   on dédoublonne par `id`, première occurrence gagnante.
 * - Au-delà de `maxPages`, `truncated` le dit — jamais en silence.
 */
export async function collectPages(
  fetchPage: (page: number, limit: number) => Promise<VendorPage>,
  { limit, maxPages }: { limit: number; maxPages: number },
): Promise<CollectedVendors> {
  const first = await fetchPage(1, limit);
  const seen = new Set<string>();
  const vendors: Restaurant[] = [];
  const add = (list: Restaurant[]) => {
    for (const v of list) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      vendors.push(v);
    }
  };
  add(first.vendors);

  const lastPage = Math.min(first.meta.totalPages, maxPages);
  for (let page = 2; page <= lastPage; page++) {
    add((await fetchPage(page, limit)).vendors);
  }

  return {
    vendors,
    total: first.meta.total,
    truncated: first.meta.totalPages > maxPages,
  };
}

// ── Accueil ──────────────────────────────────────────────────────────────────

/** `?vendeurs=24` → 24 ; arrondi au lot supérieur, borné à [lot, maximum]. */
export function parseShowcaseCount(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(value) || value <= SHOWCASE_BATCH) return SHOWCASE_BATCH;
  return Math.min(SHOWCASE_MAX, Math.ceil(value / SHOWCASE_BATCH) * SHOWCASE_BATCH);
}

export interface ShowcaseView {
  /** Il reste des vendeurs et l'accueil peut encore grandir. */
  canShowMore: boolean;
  /** Taille du lot suivant (`?vendeurs=`). */
  nextCount: number;
  /** Lien « Voir les N vendeurs » : dès qu'il en existe un. */
  showCatalogueLink: boolean;
}

export function showcaseView(shown: number, total: number, requested: number): ShowcaseView {
  return {
    canShowMore: shown < total && requested < SHOWCASE_MAX,
    nextCount: Math.min(SHOWCASE_MAX, requested + SHOWCASE_BATCH),
    showCatalogueLink: total > 0,
  };
}

// ── Catalogue (/restaurants) ────────────────────────────────────────────────

/** Types acceptés dans l'URL. L'affichage ne propose que ceux qui ont des vendeurs. */
export const VENDOR_TYPE_ORDER: VendorType[] = [
  'RESTAURANT',
  'HOME_COOK',
  'BAKERY',
  'BEVERAGE_SHOP',
  'GROCERY',
];

/** Libellés de filtre — une seule forme (plurielle), partagée par l'accueil et le catalogue. */
export const VENDOR_TYPE_PLURAL: Record<VendorType, string> = {
  RESTAURANT: 'Restaurants',
  HOME_COOK: 'Cuisines maison',
  BAKERY: 'Boulangeries',
  BEVERAGE_SHOP: 'Boissons',
  GROCERY: 'Épiceries',
};

export interface CatalogueParams {
  q: string;
  vendorType: VendorType | null;
  openOnly: boolean;
  page: number;
}

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogueParams(sp: Record<string, SearchParamValue>): CatalogueParams {
  const rawType = first(sp.vendorType);
  const page = Number(first(sp.page));
  return {
    q: (first(sp.q) ?? '').trim().slice(0, 80),
    vendorType:
      rawType && (VENDOR_TYPE_ORDER as string[]).includes(rawType) ? (rawType as VendorType) : null,
    openOnly: first(sp.ouvert) === '1',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/**
 * URL partageable du catalogue. Tout changement de filtre ramène en page 1 —
 * la page 3 d'un autre filtre n'a pas de sens ; seul `page` explicite la garde.
 */
export function catalogueHref(current: CatalogueParams, change: Partial<CatalogueParams>): string {
  const next: CatalogueParams = {
    ...current,
    ...change,
    page: change.page ?? (Object.keys(change).length > 0 ? 1 : current.page),
  };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.vendorType) params.set('vendorType', next.vendorType);
  if (next.openOnly) params.set('ouvert', '1');
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/restaurants?${query}` : '/restaurants';
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Recherche texte d'un vendeur : nom, adresse, spécialités, sans accents.
 *
 * Elle reste côté site parce que `GET /vendors` n'a pas de paramètre de
 * recherche ; elle ne décide d'aucune règle métier (visibilité, ouverture),
 * elle choisit seulement parmi ce que le serveur a déjà déclaré visible.
 */
export function matchesVendorQuery(vendor: Restaurant, q: string): boolean {
  const needle = fold(q.trim());
  if (!needle) return true;
  return (
    fold(vendor.nom).includes(needle) ||
    fold(vendor.adresse ?? '').includes(needle) ||
    (vendor.specialties ?? []).some((s) => fold(s.name).includes(needle))
  );
}

export function paginate<T>(list: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const start = (page - 1) * pageSize;
  return { items: list.slice(start, start + pageSize), totalPages };
}

// ── Facettes ─────────────────────────────────────────────────────────────────

export interface VendorFacets {
  byType: Record<VendorType, number>;
  /** Vendeurs ouverts maintenant (colonne `isOpen`, tenue par le serveur). */
  open: number;
  total: number;
}

export interface TypeFilter {
  type: VendorType;
  label: string;
  count: number;
}

/** Types réellement présents : jamais une catégorie vide parce qu'elle existe dans l'enum. */
export function availableTypeFilters(facets: VendorFacets): TypeFilter[] {
  return VENDOR_TYPE_ORDER.filter((type) => (facets.byType[type] ?? 0) > 0).map((type) => ({
    type,
    label: VENDOR_TYPE_PLURAL[type],
    count: facets.byType[type],
  }));
}

/** « 9 vendeurs · 1 ouvert en ce moment » — dit ce qui est vérifiable, rien de plus. */
export function vendorCountLabel(total: number, open: number): string {
  const plural = total > 1 ? 's' : '';
  if (total === 0) return 'Aucun vendeur pour le moment';
  if (open === 0) return `${total} vendeur${plural} · aucun ouvert en ce moment`;
  if (open === total) return `${total} vendeur${plural}, tous ouverts`;
  return `${total} vendeur${plural} · ${open} ouvert${open > 1 ? 's' : ''} en ce moment`;
}
