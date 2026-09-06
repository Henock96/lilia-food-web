import type { Product, ProductVendorRef } from '@lilia/types';
import { availabilityWindowLabel } from './availability';

/**
 * « Ce produit est-il commandable, et sinon pourquoi ? »
 *
 * Fonction pure, extraite du composant pour être testable : la fiche produit
 * doit répondre correctement à six situations distinctes, et les vérifier en
 * montant React à chaque fois serait long à écrire, lent à exécuter et fragile.
 *
 * ⚠️ **Elle n'applique aucune règle métier, elle les assemble.** Chaque motif de
 * refus vient d'un champ décidé par le serveur — `isAvailable`, `stockRestant`,
 * `isOpen`, `availableNow`. En particulier, la fenêtre horaire n'est **pas**
 * recalculée ici : `availableNow` est le verdict de
 * `isWithinAvailabilityWindow`, la fonction même qu'applique le checkout. Deux
 * implémentations d'une même règle divergent en silence, et c'est déjà arrivé
 * sur les montants.
 *
 * Le serveur refuse de son côté quoi qu'il arrive ; ce calcul évite seulement
 * au client de découvrir le refus après avoir choisi sa quantité.
 *
 * L'authentification n'entre pas dans la décision : un visiteur non connecté
 * garde un bouton actif, qui l'emmène se connecter. Le griser lui ferait croire
 * que le produit est indisponible.
 */

export type PurchaseBlocker =
  /** Le vendeur l'a retiré de la vente (`isAvailable === false`). */
  | 'withdrawn'
  /** `stockRestant === 0`. */
  | 'out_of_stock'
  /** La boutique est fermée en ce moment. */
  | 'vendor_closed'
  /** Hors de la fenêtre horaire du produit, selon le serveur. */
  | 'outside_window'
  /** Aucune variante vendable — le prix serait indéterminé. */
  | 'no_variant';

export interface PurchaseState {
  canAdd: boolean;
  /** `null` quand le produit est commandable. */
  blocker: PurchaseBlocker | null;
  /** Message destiné au client. `null` quand le produit est commandable. */
  message: string | null;
  /** Plafond du sélecteur de quantité. */
  maxQuantity: number;
  /** Fenêtre horaire, affichée même quand le produit est disponible. */
  windowLabel: string | null;
}

/** Plafond par défaut, aligné sur `QuantityStepper`. */
const DEFAULT_MAX_QUANTITY = 99;

export function computePurchaseState(
  product: Pick<
    Product,
    | 'variants'
    | 'stockRestant'
    | 'isAvailable'
    | 'availableNow'
    | 'availableFrom'
    | 'availableUntil'
  >,
  /** `null` si le produit est servi sans son vendeur (réponse ancienne). */
  vendor: Pick<ProductVendorRef, 'isOpen'> | null,
): PurchaseState {
  const windowLabel = availabilityWindowLabel(product);
  // `stockRestant === null` = stock illimité, `0` = épuisé. La distinction est
  // portée par `null`, pas par une valeur sentinelle : `?? DEFAULT` la garde.
  const maxQuantity =
    product.stockRestant === null || product.stockRestant === undefined
      ? DEFAULT_MAX_QUANTITY
      : Math.min(product.stockRestant, DEFAULT_MAX_QUANTITY);

  const blocked = (blocker: PurchaseBlocker, message: string): PurchaseState => ({
    canAdd: false,
    blocker,
    message,
    maxQuantity: Math.max(1, maxQuantity),
    windowLabel,
  });

  // Ordre du plus définitif au plus circonstanciel. Un produit retiré de la
  // vente le reste quelle que soit l'heure ; une boutique fermée rouvre demain.
  //
  // ⚠️ `isAvailable` et `availableNow` sont absents des réponses antérieures :
  // `undefined` vaut `true` dans les deux cas. Les lire comme `false`
  // retirerait tout le catalogue de la vente le jour d'un déploiement partiel.
  if (product.isAvailable === false) {
    return blocked('withdrawn', 'Momentanément indisponible');
  }
  if (product.stockRestant === 0) {
    return blocked('out_of_stock', 'Épuisé pour aujourd’hui');
  }
  if (product.variants.length === 0) {
    return blocked('no_variant', 'Aucune option en vente pour ce produit');
  }
  if (vendor && !vendor.isOpen) {
    return blocked('vendor_closed', 'Ce vendeur est fermé actuellement');
  }
  if (product.availableNow === false) {
    return blocked(
      'outside_window',
      windowLabel ?? 'Ce produit n’est pas vendu à cette heure',
    );
  }

  return { canAdd: true, blocker: null, message: null, maxQuantity, windowLabel };
}
