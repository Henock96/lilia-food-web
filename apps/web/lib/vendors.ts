import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { apiClientRaw } from '@lilia/api-client';
import type { VendorType } from '@lilia/types';
import {
  MAX_COLLECTED_PAGES,
  SERVER_MAX_LIMIT,
  VENDOR_TYPE_ORDER,
  collectPages,
  normalizeVendorPage,
  vendorsPath,
  type CollectedVendors,
  type RawVendorResponse,
  type VendorFacets,
  type VendorPage,
  type VendorQuery,
} from './vendor-catalog';

/**
 * Lectures serveur du catalogue public `GET /vendors`.
 *
 * Le serveur décide de **qui** est visible (`PUBLIC_VENDOR_WHERE`) et dans
 * **quel ordre** (`PUBLIC_VENDOR_ORDER_BY` : ouverts d'abord, rang admin, mise
 * en avant, ancienneté). Ce module ne fait que demander des pages et garder
 * leurs métadonnées — la règle « la grille ne décide jamais du `limit` » est
 * expliquée dans `vendor-catalog.ts`.
 *
 * ## Trois lectures, trois usages
 *
 * | Fonction | Pour | Appels |
 * |---|---|---|
 * | `getVendorPage` | accueil (un lot), catalogue sans recherche (une page) | 1 |
 * | `getVendorFacets` | compteurs par type et « ouverts » | 6, `limit=1` |
 * | `getAllVendors` | catalogue **avec** recherche texte (le serveur n'en a pas) | ⌈N/100⌉, borné |
 *
 * L'accueil n'appelle jamais `getAllVendors`.
 *
 * ## Cache — trois règles héritées, toutes conservées
 *
 * 1. `cacheTag('vendors')` : invalidable par `retryVendors()` et
 *    `POST /api/revalidate`.
 * 2. `cacheLife('minutes')` : un vendeur qui ouvre ou rejoint le catalogue se
 *    reflète en quelques minutes.
 * 3. Le `try/catch` vit **hors** de la frontière `'use cache'` : une erreur
 *    levée à l'intérieur n'est jamais persistée, alors qu'un `[]` retourné
 *    depuis l'intérieur serait mis en cache comme un catalogue vide. La
 *    validation (`normalizeVendorPage`) est faite **à l'intérieur** pour la
 *    même raison : une réponse invalide lève, donc n'est pas mémorisée.
 *
 * `await connection()` sort ces lectures du prerender de build : le backend
 * Render s'endort, et un déploiement ne doit pas dépendre de sa disponibilité.
 * Les appelants doivent donc être sous `<Suspense>`.
 */

async function fetchVendorPage(query: VendorQuery): Promise<VendorPage> {
  'use cache';
  cacheTag('vendors');
  cacheLife('minutes');
  const raw = await apiClientRaw<RawVendorResponse>(vendorsPath(query));
  return normalizeVendorPage(raw, query);
}

/**
 * Résultat d'une lecture : la panne est un état à part entière, jamais une
 * liste vide. C'est ce que l'accueil confondait — backend injoignable et
 * catalogue vide y rendaient le même écran.
 */
export type Loaded<T> = { status: 'ok'; value: T } | { status: 'error' };

export async function getVendorPage(query: VendorQuery): Promise<Loaded<VendorPage>> {
  await connection();
  try {
    return { status: 'ok', value: await fetchVendorPage(query) };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Compteurs du catalogue, lus sur `meta.total` de requêtes `limit=1` : le coût
 * ne dépend pas du nombre de vendeurs, et c'est le serveur qui compte — avec
 * sa propre définition de « visible » et de « ouvert ».
 */
export async function getVendorFacets(): Promise<Loaded<VendorFacets>> {
  await connection();
  try {
    const count = async (filter: Pick<VendorQuery, 'vendorType' | 'isOpen'>) =>
      (await fetchVendorPage({ page: 1, limit: 1, ...filter })).meta.total;
    const [open, ...byTypeCounts] = await Promise.all([
      count({ isOpen: true }),
      ...VENDOR_TYPE_ORDER.map((vendorType) => count({ vendorType })),
    ]);
    const byType = Object.fromEntries(
      VENDOR_TYPE_ORDER.map((type, i) => [type, byTypeCounts[i]]),
    ) as Record<VendorType, number>;
    const total = byTypeCounts.reduce((sum, n) => sum + n, 0);
    return { status: 'ok', value: { byType, open, total } };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Tout le catalogue répondant aux filtres serveur, page par page (100), borné à
 * `MAX_COLLECTED_PAGES`. Une page en échec fait échouer l'ensemble : jamais un
 * catalogue partiel présenté comme complet.
 */
export async function getAllVendors(
  filter: Pick<VendorQuery, 'vendorType' | 'isOpen'>,
): Promise<Loaded<CollectedVendors>> {
  await connection();
  try {
    const value = await collectPages(
      (page, limit) => fetchVendorPage({ page, limit, ...filter }),
      { limit: SERVER_MAX_LIMIT, maxPages: MAX_COLLECTED_PAGES },
    );
    if (value.truncated) {
      console.warn(
        `[vendors] catalogue tronqué à ${value.vendors.length}/${value.total} vendeurs (garde-fou ${MAX_COLLECTED_PAGES} pages)`,
      );
    }
    return { status: 'ok', value };
  } catch {
    return { status: 'error' };
  }
}
