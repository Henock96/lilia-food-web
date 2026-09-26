import type { ActiveOffer } from '@lilia/types';

/**
 * F3-11 — texte court du badge d'offre boutique : « −10 % » ou « −500 F ».
 * Le libellé complet (« −10 % sur toute la boutique ») est écrit par le
 * serveur ; ceci n'en est que la version qui tient sur une photo.
 */
export function offerShortLabel(offer: Pick<ActiveOffer, 'kind' | 'value'>): string {
  return offer.kind === 'PERCENT' ? `−${offer.value} %` : `−${offer.value} F`;
}
