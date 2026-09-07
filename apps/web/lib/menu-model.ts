import type { Category, Product, Restaurant } from '@lilia/types';

/**
 * **Le modèle de rendu d'une carte** — extrait de `RestaurantMenu`.
 *
 * Ce regroupement vivait dans le corps du composant, donc hors de portée de
 * tout test : c'est là qu'ont vécu deux défauts qu'on ne pouvait pas
 * caractériser autrement qu'en ouvrant la page.
 *
 * Il ne calcule **aucune règle métier**. Le serveur a déjà décidé de tout ce qui
 * relève du commerce — quels produits existent, dans quel ordre, actifs ou non,
 * dans leur fenêtre horaire ou non, épuisés ou non. Ici on ne fait que ranger :
 * les sections déclarées par le vendeur, dans l'ordre reçu, et les produits qui
 * n'appartiennent à aucune section visible.
 */
export type MenuSection = {
  id: string;
  nom: string;
  products: Product[];
};

export type MenuModel = {
  sections: MenuSection[];
  /** Produits sans section, ou dont la section a été désactivée. */
  uncategorized: Product[];
  /** Vrai quand la carte ne contient aucun produit du tout. */
  isEmpty: boolean;
};

/** Libellé de la section fourre-tout.
 *
 * Le site disait « Autres plats » et l'application « Autres ». Sur une
 * boulangerie ou une boutique de boissons, « Autres plats » est simplement
 * faux : un croissant n'est pas un plat. Un seul mot, juste partout.
 */
export const UNCATEGORIZED_LABEL = 'Autres';

export function buildMenuModel(restaurant: Restaurant): MenuModel {
  const products = restaurant.products ?? [];
  const declared = restaurant.categories ?? [];

  /**
   * Les sections viennent du serveur, déjà triées par `displayOrder` et
   * filtrées sur `isActive`.
   *
   * Repli sur les sections dérivées des produits **uniquement** si le backend
   * ne les a pas fournies (client à jour, serveur antérieur). C'était autrefois
   * l'unique chemin, et l'ordre était alors celui de création des produits —
   * arbitraire et instable.
   */
  const source: Category[] =
    declared.length > 0
      ? declared
      : Array.from(
          new Map(
            products
              .filter((p) => p.category)
              .map((p) => [p.category!.id, p.category!]),
          ).values(),
        );

  /**
   * ⚠️ Le groupement se fait par **`categoryId`**, jamais par nom.
   *
   * L'application comparait `product.category?.name` à des chaînes. Le résultat
   * était le même la plupart du temps — le `slug` garantit l'unicité du nom par
   * vendeur — mais renommer une section pendant qu'un client a l'écran ouvert
   * faisait basculer tous ses produits dans « Autres ». Un identifiant ne bouge
   * pas, un libellé si.
   */
  const sections = source
    .map((cat) => ({
      id: cat.id,
      nom: cat.nom,
      products: products.filter((p) => p.categoryId === cat.id),
    }))
    // Une section sans produit visible n'est pas rendue : promettre une section
    // vide au client, c'est lui promettre un contenu qui n'existe pas.
    .filter((s) => s.products.length > 0);

  const shownIds = new Set(sections.map((s) => s.id));
  const uncategorized = products.filter(
    (p) => !p.categoryId || !shownIds.has(p.categoryId),
  );

  return { sections, uncategorized, isEmpty: products.length === 0 };
}

/**
 * Le produit est-il commandable **maintenant** ?
 *
 * Aucune règle n'est recalculée : `availableNow` est le verdict du serveur,
 * `stockRestant` sa convention (`null` = illimité, `0` = épuisé), `isOpen`
 * l'état de la boutique. Les trois causes restent distinctes parce qu'elles
 * appellent trois messages différents.
 *
 * ⚠️ `undefined` vaut « disponible » sur `isAvailable` et `availableNow` : ces
 * champs sont absents des réponses antérieures à septembre 2026, et un produit
 * servi par le catalogue est par construction vendable.
 */
export function menuItemState(
  product: Pick<Product, 'stockRestant' | 'isAvailable' | 'availableNow'>,
  restaurantOpen: boolean,
): { orderable: boolean; badge: 'rupture' | 'indisponible' | null } {
  const outOfStock =
    product.stockRestant !== null && product.stockRestant === 0;

  // Un produit épuisé RESTE affiché, avec son badge : le masquer laisserait
  // croire au client qu'il n'est pas au menu. C'est le comportement du site
  // qui a été retenu comme canonique, contre celui de l'application, qui le
  // faisait disparaître.
  if (outOfStock) return { orderable: false, badge: 'rupture' };
  if (product.isAvailable === false || product.availableNow === false) {
    return { orderable: false, badge: 'indisponible' };
  }
  return { orderable: restaurantOpen, badge: null };
}
