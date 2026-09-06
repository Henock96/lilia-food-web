'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

/**
 * Émet `product_view` à l'ouverture d'une fiche produit.
 *
 * Composant client sans rendu, monté par la page produit — qui est un composant
 * **serveur** et ne peut donc pas mesurer elle-même.
 *
 * ⚠️ Ne jamais réutiliser ce composant dans une ligne de menu ou une carte de
 * liste. `product_view` signifie « le client a ouvert la fiche », pas « le
 * produit est apparu ». Un menu de trente plats en émettrait trente, et le
 * troisième étage du tunnel dépasserait le deuxième.
 *
 * C'est ce composant qui referme le trou documenté au §7 de `docs/analytics.md` :
 * jusqu'ici le site n'avait pas de fiche produit, et `product_view` était le
 * seul événement du contrat qu'il ne pouvait pas émettre honnêtement.
 */
export function TrackProductView({
  productId,
  productName,
  restaurantId,
  price,
}: {
  productId: string;
  productName: string;
  restaurantId: string;
  price: number;
}) {
  useEffect(() => {
    analytics.track('product_view', {
      product_id: productId,
      product_name: productName,
      restaurant_id: restaurantId,
      price,
    });
  }, [productId, productName, restaurantId, price]);

  return null;
}
