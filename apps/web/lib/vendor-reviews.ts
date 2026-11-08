import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { apiClient } from '@lilia/api-client';
import type { Review, ReviewStats } from '@lilia/types';
import { reportServerReadFailure, serverReadSignal } from './server-read';

/**
 * **Note et avis d'un vendeur, tels que sa fiche les affiche.**
 *
 * Ces lectures vivaient dans le composant, derrière un `'use cache'` sans
 * étiquette ni durée, avec leur `try/catch` **à l'intérieur** : une panne
 * passagère était mémorisée comme « aucun avis » (`null` / `[]`) et servie
 * telle quelle jusqu'à expiration. Même règle désormais que `vendor-menu.ts` :
 * la frontière ne contient aucun `catch`, l'échec est rattrapé dehors, et une
 * rejection n'est jamais mise en cache.
 *
 * `vendor-<id>` : purgées avec la carte du vendeur (`POST /api/revalidate`).
 */
async function fetchReviewStats(id: string): Promise<ReviewStats> {
  'use cache: remote';
  cacheTag('vendors');
  cacheTag(`vendor-${id}`);
  cacheLife('minutes');
  return apiClient<ReviewStats>(`/reviews/restaurant/${id}/stats`, { signal: serverReadSignal() });
}

async function fetchReviews(id: string): Promise<Review[]> {
  'use cache: remote';
  cacheTag('vendors');
  cacheTag(`vendor-${id}`);
  cacheLife('minutes');
  // Le backend renvoie `{ message, data: reviews, stats }` → après le wrap
  // global c'est `{ data: { message, data: reviews, stats } }`. `apiClient`
  // déballe un niveau → on obtient `{ message, data: reviews, stats }`, donc
  // on extrait encore `.data` pour récupérer le tableau d'avis.
  const res = await apiClient<Review[] | { data?: Review[] }>(`/reviews/restaurant/${id}`, {
    signal: serverReadSignal(),
  });
  return Array.isArray(res) ? res : (res?.data ?? []);
}

/**
 * Une panne ne fait pas échouer la fiche : la section des avis s'affiche
 * simplement vide, pour cette visite seulement, et la panne est tracée.
 */
export async function getVendorReviews(
  id: string,
): Promise<{ stats: ReviewStats | null; reviews: Review[] }> {
  const [stats, reviews] = await Promise.all([
    fetchReviewStats(id).catch((error: unknown) => {
      reportServerReadFailure(`note du vendeur ${id}`, error);
      return null;
    }),
    fetchReviews(id).catch((error: unknown): Review[] => {
      reportServerReadFailure(`avis du vendeur ${id}`, error);
      return [];
    }),
  ]);
  return { stats, reviews };
}
