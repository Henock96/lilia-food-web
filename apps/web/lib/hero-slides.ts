import 'server-only';
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
export async function fetchBanners(): Promise<HeroBannerSlide[]> {
  try {
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
  } catch {
    return [];
  }
}
