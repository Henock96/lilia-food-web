/**
 * Estimation du montant d'une commande **avant** son envoi au serveur.
 *
 * Pendant du `CheckoutEstimate` Flutter (`lilia-app/lib/features/commandes/
 * domain/checkout_estimate.dart`), et miroir pas-à-pas de
 * `OrderCheckoutService.createOrderFromCart` + `OrderCalculatorService.calculate`
 * côté backend.
 *
 * Il existe parce que le panier web calculait ses propres montants en dur :
 *
 * | Poste | Web (avant) | Serveur |
 * |---|---|---|
 * | Frais de service | `subTotal * 0.08` | `PlatformSettings.serviceFeePercent` (15 % en prod) |
 * | Livraison | `1000` figé | `Restaurant.fixedDeliveryFee` ou zone `ZONE_BASED` |
 * | Fidélité | `points * 5`, sans plafond | `min(solde, floor(panier / valeurDuPoint))` |
 *
 * Sur une commande de 10 000 XAF, le client voyait 800 XAF de frais et était
 * débité de 1 500. Le total affiché n'était pas celui encaissé.
 *
 * ⚠️ Ce module n'est **pas** une seconde source de vérité : il ne décide de
 * rien. Il consomme des valeurs serveur (`GET /platform-settings`,
 * `GET /quartiers/delivery-fee`, `Restaurant`, `POST /promo/validate`) et se
 * borne à les recomposer dans le même ordre que le serveur, pour afficher un
 * montant avant que la commande n'existe. Le total facturé reste celui calculé
 * au checkout.
 */

/** Sous-ensemble de `GET /platform-settings` utile au calcul. */
export interface PricingSettings {
  serviceFeePercent: number;
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
}

/**
 * Repli utilisé **uniquement** si `GET /platform-settings` est injoignable.
 *
 * Il reprend les `@default` du modèle Prisma `PlatformSettings`, pas une
 * constante inventée côté web. Une panne de cette route ne doit pas fermer la
 * caisse.
 *
 * ⚠️ **Ce repli est FAUX en production, et c'est assumé.** Le `@default` du
 * schéma vaut 8 %, la production applique **15 %** : sur un panier de
 * 10 000 XAF, ce repli annonce 800 XAF de frais pour un débit réel de 1 500.
 *
 * C'est précisément le défaut que ce module existe pour avoir corrigé — le
 * panier calculait `subTotal * 0.08` en dur — et le repli le rouvrait en
 * silence sur le seul chemin où personne ne regarde : la panne.
 *
 * On ne le remplace pas par `15` : écrire la valeur de production dans le code
 * du client recrée exactement la constante en dur qu'on a retirée, et elle
 * redeviendra fausse au premier changement de tarif. La sortie est ailleurs —
 * `settingsKnown` ci-dessous : quand le serveur n'a pas répondu, l'écran
 * **n'annonce aucun montant de frais** plutôt qu'un montant faux.
 */
export const PRICING_SETTINGS_FALLBACK: PricingSettings = {
  serviceFeePercent: 8,
  loyaltyPointValueXaf: 50,
  loyaltyMinRedemption: 1,
};

export interface CheckoutEstimateInput {
  subTotal: number;
  /**
   * Le serveur a-t-il réellement répondu, ou travaille-t-on sur le repli ?
   *
   * `false` signifie « le taux de frais de service est INCONNU ». Les montants
   * restent calculés — il faut bien afficher quelque chose de cohérent — mais
   * l'interface doit cesser de les présenter comme des montants sûrs.
   *
   * Par défaut `true` : les appelants qui disposent des réglages serveur, y
   * compris tous les tests existants, n'ont rien à changer.
   */
  settingsKnown?: boolean;
  /**
   * Frais de livraison **du vendeur**, tels que renvoyés par le serveur
   * (`GET /quartiers/delivery-fee` quand un quartier est connu, sinon
   * `Restaurant.fixedDeliveryFee`). Jamais une constante.
   */
  deliveryFee: number;
  isDelivery: boolean;
  settings: PricingSettings;
  /** `discountAmount` de `POST /promo/validate`, 0 si aucun code valide. */
  promoDiscount?: number;
  /**
   * `newDeliveryFee` de `POST /promo/validate` (codes `FREE_DELIVERY`).
   * `undefined` = la promo ne touche pas la livraison.
   */
  promoDeliveryFee?: number;
  loyaltyPoints?: number;
  useLoyaltyPoints?: boolean;
}

export interface CheckoutEstimate {
  subTotal: number;
  /** Frais réellement comptés : 0 en retrait, remise `FREE_DELIVERY` appliquée. */
  deliveryFee: number;
  /** Frais de livraison avant promo — sert à afficher le montant barré. */
  baseDeliveryFee: number;
  deliveryDiscount: number;
  serviceFee: number;
  promoDiscount: number;
  loyaltyDiscount: number;
  loyaltyPointsUsed: number;
  total: number;
  /**
   * `false` quand `GET /platform-settings` n'a pas répondu et que le repli a
   * servi. L'écran doit alors taire le montant des frais de service au lieu
   * d'annoncer une valeur qu'il sait possiblement fausse : le `@default` du
   * schéma (8 %) et la production (15 %) divergent.
   */
  settingsKnown: boolean;
}

/**
 * Reproduit le serveur étape par étape. L'ordre compte : la fidélité se calcule
 * sur ce qui reste dû **après** la promo, et se plafonne à ce montant — sans
 * quoi un gros solde de points sur une petite commande brûlerait des points
 * pour rien (et afficherait 0 à payer là où le serveur facture le reliquat).
 */
export function computeCheckoutEstimate({
  subTotal,
  deliveryFee,
  isDelivery,
  settings,
  promoDiscount = 0,
  promoDeliveryFee,
  loyaltyPoints = 0,
  useLoyaltyPoints = false,
  settingsKnown = true,
}: CheckoutEstimateInput): CheckoutEstimate {
  // `OrderCalculatorService` : la livraison n'entre pas dans un retrait.
  const baseDeliveryFee = isDelivery ? Math.round(deliveryFee) : 0;

  // `newDeliveryFee` ne s'applique qu'en livraison : un code `FREE_DELIVERY`
  // sur une commande à emporter ne doit rien offrir.
  const effectiveDeliveryFee =
    isDelivery && promoDeliveryFee !== undefined
      ? Math.round(promoDeliveryFee)
      : baseDeliveryFee;

  // Commission calculée sur le sous-total uniquement, jamais sur la livraison.
  const serviceFee = Math.round((subTotal * settings.serviceFeePercent) / 100);

  const remaining = Math.max(
    0,
    subTotal + effectiveDeliveryFee + serviceFee - promoDiscount,
  );

  // ⚠️ Assiette des points : le **panier alimentaire**, pas le montant dû.
  //
  // Les points s'imputaient sur `subTotal + livraison + frais de service` : ils
  // finançaient la course du livreur et le fonctionnement de la plateforme,
  // deux postes réellement décaissés que le reversement vendeur ne compense
  // pas. Ils ne réduisent plus que la nourriture, promo déduite.
  //
  // Miroir exact d'`OrderCheckoutService` : un écart ici afficherait un total
  // que le serveur ne facturerait pas.
  const redeemableBase = Math.max(0, subTotal - promoDiscount);

  let loyaltyPointsUsed = 0;
  let loyaltyDiscount = 0;
  if (useLoyaltyPoints && loyaltyPoints >= settings.loyaltyMinRedemption) {
    loyaltyPointsUsed = Math.min(
      loyaltyPoints,
      Math.floor(redeemableBase / settings.loyaltyPointValueXaf),
    );
    loyaltyDiscount = loyaltyPointsUsed * settings.loyaltyPointValueXaf;
  }

  return {
    subTotal: Math.round(subTotal),
    deliveryFee: effectiveDeliveryFee,
    baseDeliveryFee,
    deliveryDiscount: baseDeliveryFee - effectiveDeliveryFee,
    serviceFee,
    promoDiscount,
    loyaltyDiscount,
    loyaltyPointsUsed,
    total: Math.max(0, remaining - loyaltyDiscount),
    settingsKnown,
  };
}

/**
 * Frais de livraison à afficher, dans le même ordre de décision que
 * `OrderCheckoutService` :
 *
 * ```
 * mode PLATFORM (F3-02)  → le devis de la grille, et rien d'autre
 * sinon : restaurant.fixedDeliveryFee,
 *         ou, si livraison && ZONE_BASED && quartier connu, le tarif de la zone
 * ```
 *
 * `quotedFee` est la réponse de `GET /quartiers/delivery-fee` — c'est le
 * serveur qui arbitre le repli « quartier hors zone → tarif fixe », pas nous.
 *
 * En mode plateforme, `fixedDeliveryFee` ne veut plus rien dire : sans devis
 * (pas encore de quartier, ou requête en cours), le prix est **inconnu** et la
 * fonction rend `null`. Rendre le prix du vendeur serait annoncer un montant
 * que le checkout ne facturera pas.
 */
export function resolveDeliveryFee({
  fixedDeliveryFee,
  deliveryPriceMode,
  quartierId,
  quotedFee,
  pricingMode = 'VENDOR_LEGACY',
}: {
  fixedDeliveryFee: number;
  deliveryPriceMode: 'FIXED' | 'ZONE_BASED';
  quartierId: string | null | undefined;
  quotedFee: number | null | undefined;
  pricingMode?: 'VENDOR_LEGACY' | 'PLATFORM';
}): number | null {
  if (pricingMode === 'PLATFORM') {
    return quartierId && typeof quotedFee === 'number' ? quotedFee : null;
  }
  if (
    deliveryPriceMode === 'ZONE_BASED' &&
    quartierId &&
    typeof quotedFee === 'number'
  ) {
    return quotedFee;
  }
  return fixedDeliveryFee;
}

/**
 * Miroir de `OrderValidator.validateMinimumOrderAmount`. Rend le message
 * d'erreur serveur, pour que le client lise la même phrase avant et après.
 *
 * Le serveur reste l'autorité : ce contrôle évite au client de découvrir le
 * refus après avoir saisi son adresse et son téléphone, il ne le remplace pas.
 */
export function minimumOrderError(
  subTotal: number,
  minimum: number,
  restaurantName: string,
): string | null {
  if (minimum > 0 && subTotal < minimum) {
    return `Montant minimum pour ${restaurantName} : ${minimum} FCFA. Votre panier : ${subTotal} FCFA.`;
  }
  return null;
}
