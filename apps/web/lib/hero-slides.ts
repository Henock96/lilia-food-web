import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { apiClientRaw } from '@lilia/api-client';
import type { Banner } from '@lilia/types';

/** Bannière promotionnelle affichée dans le hero de la home. */
export interface HeroBannerSlide {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  linkUrl: string;
  displayOrder: number;
}

/** Nombre maximum de slides — au-delà, plus personne ne les regarde. */
const MAX_SLIDES = 5;

/**
 * Récupère les bannières actives depuis le backend et les mappe en slides
 * prêts à afficher dans le hero. Les bannières sont triées par `displayOrder`
 * côté backend, on se contente de limiter à {@link MAX_SLIDES}.
 *
 * Retourner 0 slide est un cas normal : aucun banner configuré dans l'admin.
 * C'est à l'appelant de gérer le cas vide (aplat, pas de rotation).
 */
/**
 * Lecture cachée des bannières.
 *
 * ⚠️ Cette frontière manquait, et c'est le seul des trois modules de lecture
 * serveur qui ne l'avait pas. Avec `cacheComponents: true`, un `fetch` non
 * caché rend le sous-arbre dynamique : `GET /banners` partait donc **à chaque
 * affichage de la page d'accueil**, depuis l'IP de sortie Vercel et sans jeton.
 *
 * Or le throttler backend trace par compte quand un jeton est présent, **par IP
 * sinon** : tous les visiteurs anonymes partageaient un unique seau de 10 req/s
 * et 100 req/min. Au-delà, `/banners` répond 429, le `catch` avale, et le hero
 * s'affiche vide pour tout le monde — sans qu'aucune erreur ne remonte.
 *
 * `cacheTag('banners')` rend l'entrée invalidable depuis le backend
 * (`POST /api/revalidate`) ; sans étiquette elle n'aurait pu être rafraîchie
 * que par un redéploiement. `cacheLife('minutes')` borne la fraîcheur.
 *
 * Le `try/catch` reste **hors** de cette frontière (voir `fetchBanners`) : une
 * rejection survenue dans une fonction `'use cache'` n'est jamais persistée,
 * alors qu'un `[]` retourné depuis l'intérieur serait mis en cache comme un
 * résultat parfaitement légitime — et la home resterait figée sans hero.
 */
async function loadBanners(): Promise<HeroBannerSlide[]> {
  'use cache';
  cacheTag('banners');
  cacheLife('minutes');

  const res = await apiClientRaw<{ data: Banner[] }>('/banners');
  return (res.data ?? [])
      .filter((b) => b.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, MAX_SLIDES)
      .map((b) => ({
        id: b.id,
        // Pas de titre de repli : une bannière sans titre n'en affiche
        // simplement aucun. Le repli précédent injectait le message de marque
        // dans le titre de la bannière, ce qui le faisait apparaître deux fois
        // dans le hero — une fois en sur-titre, une fois dans le `h1`.
        title: b.title ?? '',
        imageUrl: b.imageUrl,
        description: b.description ?? '',
        linkUrl: b.linkUrl ?? '/restaurants',
        displayOrder: b.displayOrder,
      }));
}

/**
 * Bannières du hero, ou une liste vide si le backend est injoignable.
 *
 * `await connection()` sort cet appel du prerender de build : le backend est un
 * service Render qui s'endort, et un déploiement ne doit pas échouer parce
 * qu'une machine distante faisait la sieste. Une rejection survenue dans une
 * frontière `'use cache'` est observée par le prerender lui-même, pas seulement
 * par l'`await` appelant — le `try/catch` ci-dessous ne suffirait pas.
 *
 * ⚠️ Corollaire : l'appelant doit l'envelopper dans un `<Suspense>`, sinon la
 * coquille de la page d'accueil cesse d'être prérendue.
 */
export async function fetchBanners(): Promise<HeroBannerSlide[]> {
  await connection();
  try {
    return await loadBanners();
  } catch {
    // Retourner 0 slide est un cas normal (aucune bannière configurée) : le
    // hero dégrade proprement vers un aplat, sans rotation.
    return [];
  }
}
