/**
 * Message du minimum de commande, identique à celui du serveur.
 *
 * Le contrôle au panier évite seulement au client de découvrir le refus après
 * avoir saisi son adresse et son téléphone : il ne remplace pas celui du
 * checkout. Aucun montant n'est calculé ici (durcissement lot 5, F-40 : les
 * montants viennent du devis serveur).
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
