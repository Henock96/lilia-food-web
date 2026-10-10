import type { ProductType, StockPolicy, VendorType } from '@lilia/types';

/**
 * Types de produits proposés par type de vendeur (LIL-114).
 *
 * Recopie de la matrice serveur (`ProductValidatorService`) : c'est le serveur
 * qui refuse, ce tableau évite seulement de proposer un choix qui finirait en
 * 400. ALCOHOL n'y figure pas (pas de vente d'alcool au lancement).
 */
export const VENDOR_PRODUCT_OPTIONS: Record<VendorType, ProductType[]> = {
  RESTAURANT: ['FOOD', 'BEVERAGE'],
  HOME_COOK: ['FOOD', 'PASTRY'],
  BAKERY: ['PASTRY', 'FOOD'],
  BEVERAGE_SHOP: ['BEVERAGE'],
  GROCERY: ['GROCERY', 'BEVERAGE'],
};

/**
 * Type pré-sélectionné à la création d'un produit.
 *
 * Le formulaire proposait « Auto (FOOD) » et n'envoyait rien : le serveur
 * retombait sur FOOD, qu'il refuse pour une épicerie ou une boutique de
 * boissons. Le premier type autorisé du vendeur est toujours acceptable.
 */
export function defaultProductType(vendorType: VendorType): ProductType {
  return VENDOR_PRODUCT_OPTIONS[vendorType][0];
}

/**
 * Types à proposer dans la liste : ceux du vendeur, plus le type actuel d'un
 * produit existant s'il sort de la matrice (donnée ancienne) — le retirer de
 * la liste le réécrirait en silence au premier enregistrement. Jamais ALCOHOL.
 */
export function productTypeChoices(
  vendorType: VendorType,
  current: ProductType | '',
): ProductType[] {
  const allowed = VENDOR_PRODUCT_OPTIONS[vendorType];
  if (!current || current === 'ALCOHOL' || allowed.includes(current)) {
    return allowed;
  }
  return [...allowed, current];
}

/**
 * Disponibilité pré-sélectionnée à la création. Une référence d'étagère se
 * compte : « Toujours disponible » la rendrait vendable à l'infini. Les
 * autres vendeurs gardent le défaut historique.
 */
export function defaultStockPolicy(vendorType: VendorType): StockPolicy {
  return vendorType === 'GROCERY' ? 'INVENTORY' : 'UNLIMITED';
}
