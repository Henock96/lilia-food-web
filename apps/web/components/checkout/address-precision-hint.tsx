'use client';

import { MapPinOff } from 'lucide-react';
import type { Adresse } from '@lilia/types';

/**
 * Signale au client ce que le livreur pourra réellement viser.
 *
 * Une adresse enregistrée depuis le web n'a pas de position posée à la main :
 * le navigateur n'offre pas (encore) de carte de sélection, et la
 * géolocalisation du navigateur donnerait la position de l'internaute, pas
 * celle de sa porte — c'est précisément la confusion qu'on vient de corriger
 * côté mobile.
 *
 * Le serveur retombe alors sur le centroïde du quartier : livrable, mais à
 * l'échelle du quartier. Le dire ici coûte une ligne et évite au client de le
 * découvrir en recevant l'appel du livreur.
 *
 * Silencieux quand la position est exacte : un avertissement permanent finit
 * par ne plus être lu.
 */
export function AddressPrecisionHint({ adresse }: { adresse: Adresse }) {
  if (adresse.locationPrecision === 'EXACT') return null;

  const situable = Boolean(adresse.quartierId);

  return (
    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
      <MapPinOff className="w-3 h-3 shrink-0" aria-hidden />
      {situable
        ? 'Livraison guidée au quartier — le livreur vous appellera'
        : 'Adresse non située — ajoutez un quartier pour guider le livreur'}
    </p>
  );
}
