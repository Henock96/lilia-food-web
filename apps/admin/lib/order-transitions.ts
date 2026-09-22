import type { OrderStatus } from '@lilia/types';

/**
 * Prochaine transition que le back-office peut proposer, ou `null`.
 *
 * ## Pourquoi cette fonction existe
 *
 * Le serveur porte **une** vérité : `ORDER_TRANSITION_MATRIX`
 * (`order-state.machine.ts`), complétée par deux gardes de cohérence terrain
 * dans `OrderLifecycleService.assertStatusMatchesGround`. Ce back-office en
 * portait une copie — la table `NEXT_STATUS` de la page Commandes — gardée par
 * un seul `canAdvanceStatus` qui ne traitait que `EN_ATTENTE`. Résultat, relevé
 * par l'audit du 22/09/2026 :
 *
 * ```
 * PRET     → EN_ROUTE   RESTAURATEUR   403
 * EN_ROUTE → LIVRER     RESTAURATEUR   403
 * ```
 *
 * Et le cas ADMIN était pire, parce qu'il avait l'air correct :
 * `assertStatusMatchesGround` exige une `Delivery` en `EN_TRANSIT` pour
 * accepter `EN_ROUTE`, or le seul chemin vers `EN_TRANSIT` —
 * `PATCH /deliveries/:id/pickup` — **bascule déjà la commande en `EN_ROUTE`**.
 * Le bouton « En route » était donc inatteignable par construction.
 *
 * ## Ce que ce n'est pas
 *
 * **Pas un contrôle d'accès.** Le serveur reste seul juge et revérifie tout.
 * Cette fonction évite seulement de promettre un geste qui échouera — une
 * question d'honnêteté de l'interface, pas de sécurité.
 *
 * ⚠️ Toute évolution de `ORDER_TRANSITION_MATRIX` doit être répercutée ici
 * **et** dans `order-transitions.test.ts`, dans le même changement. Le même
 * couple existe côté `lilia-food-admin` (`models/order_transitions.dart`).
 */
export function nextOrderStatus({
  current,
  role,
  isDelivery,
}: {
  current: OrderStatus;
  role: string | undefined;
  isDelivery: boolean;
}): OrderStatus | null {
  // Ce back-office ne sert que le vendeur et l'administrateur. Un rôle inconnu
  // — ou pas encore chargé, au premier rendu — ne propose rien plutôt que de
  // proposer au hasard.
  if (role !== 'ADMIN' && role !== 'RESTAURATEUR') return null;
  const isAdmin = role === 'ADMIN';

  switch (current) {
    case 'EN_ATTENTE':
      // Confirmation manuelle d'un virement : ADMIN uniquement.
      return isAdmin ? 'PAYER' : null;

    case 'PAYER':
      return 'EN_PREPARATION';

    case 'EN_PREPARATION':
      return 'PRET';

    case 'PRET':
      // Retrait au comptoir : le vendeur remet le sac en main propre. Sur une
      // livraison, c'est le livreur qui constate — le raccourci clôturerait la
      // commande et créditerait les points de fidélité alors que le client n'a
      // rien reçu.
      //
      // `EN_ROUTE` n'apparaît pas, délibérément : voir l'en-tête.
      return isDelivery ? null : 'LIVRER';

    case 'EN_ROUTE':
      // Le livreur roule : ni le vendeur ni l'administrateur ne clôturent
      // depuis la file des commandes. L'admin dispose de la fiche de livraison
      // pour rattraper une course bloquée.
      return null;

    case 'LIVRER':
    case 'ANNULER':
      return null;
  }
}
