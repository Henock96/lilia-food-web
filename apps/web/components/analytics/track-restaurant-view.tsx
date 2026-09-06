'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

/**
 * Émet `restaurant_view` à l'ouverture d'une fiche vendeur.
 *
 * Composant client sans rendu, monté par la page vendeur — qui est un composant
 * **serveur** et ne peut donc pas mesurer elle-même. Le monter ici plutôt que
 * dans le hero ou dans le menu garantit qu'il y a exactement un émetteur par
 * page : deux composants qui « savent » quel vendeur est affiché finiraient par
 * l'annoncer tous les deux.
 *
 * ⚠️ Ne jamais réutiliser ce composant dans une carte de liste. `restaurant_view`
 * signifie « le client a ouvert la fiche », pas « la fiche est apparue ». Une
 * liste de vingt vendeurs en émettrait vingt, et le second étage du tunnel
 * dépasserait le premier.
 */
export function TrackRestaurantView({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string;
  restaurantName: string;
}) {
  useEffect(() => {
    analytics.track('restaurant_view', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [restaurantId, restaurantName]);

  return null;
}
