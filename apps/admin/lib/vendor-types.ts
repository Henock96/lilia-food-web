import type { VendorType } from '@lilia/types';

/**
 * Types proposés à la création d'un vendeur (`POST /admin/vendors`).
 *
 * Le serveur accepte les cinq : un type absent de cette liste est un type que
 * personne ne peut créer depuis le back-office. L'épicerie en était absente.
 */
export const CREATABLE_VENDOR_TYPES: {
  value: VendorType;
  label: string;
  helper: string;
}[] = [
  { value: 'RESTAURANT', label: 'Restaurant', helper: 'Plats chauds, repas — validé d’office' },
  { value: 'HOME_COOK', label: 'Cuisine maison', helper: 'Pâtissiers, traiteurs — validation admin requise' },
  { value: 'BAKERY', label: 'Boulangerie', helper: 'Viennoiseries, pain — validation admin requise' },
  { value: 'BEVERAGE_SHOP', label: 'Boissons', helper: 'Sodas, jus, eaux (pas d’alcool) — validation admin requise' },
  {
    value: 'GROCERY',
    label: 'Épicerie / supérette',
    helper: 'Produits emballés, hygiène, bébé (pas d’alcool) — validation admin requise',
  },
];
