import type {
  Cart,
  CartItem,
  CartLineOption,
  ModifierGroup,
  ModifierOption,
  SelectedOption,
} from '@lilia/types';

/**
 * F3-09 — options & suppléments, côté site.
 *
 * ## Le serveur est l'autorité des montants
 *
 * `GET /cart` porte, par ligne, `unitPriceXaf` (variante + options) et
 * `lineTotalXaf`, et au niveau du panier `subTotalXaf`. Ces helpers les lisent
 * **en priorité**. Le repli (serveur antérieur à F3-09) reproduit l'ancienne
 * règle, corrigée pour les menus : un menu compte une fois, à son prix.
 *
 * La sélection (`ModifierSelection`) n'est que de l'ergonomie : radio, plafond
 * du groupe, bouton désactivé tant qu'un choix obligatoire manque. La règle
 * qui fait foi est celle du serveur, à l'ajout puis au checkout.
 */

/** Prix unitaire d'une ligne : celui du serveur, sinon variante + options. */
export function cartLineUnitPrice(item: CartItem): number {
  if (typeof item.unitPriceXaf === 'number') return item.unitPriceXaf;
  const options = (item.options ?? []).reduce(
    (sum, o) => sum + o.priceDeltaXaf * o.quantity,
    0,
  );
  return (item.variant?.prix ?? 0) + options;
}

/**
 * Montant d'une ligne dans le sous-total. Menu : la première ligne du groupe
 * porte `menu.prix × quantite`, les suivantes 0 — la règle du serveur.
 */
export function cartLineTotal(item: CartItem, index: number, items: CartItem[]): number {
  if (typeof item.lineTotalXaf === 'number') return item.lineTotalXaf;
  if (item.menuId && item.menu) {
    const first = items.findIndex((i) => i.menuId === item.menuId);
    return first === index ? item.menu.prix * item.quantite : 0;
  }
  return cartLineUnitPrice(item) * item.quantite;
}

/** Sous-total du panier : celui du serveur quand il est servi. */
export function cartSubtotal(cart: Pick<Cart, 'items' | 'subTotalXaf'> | null | undefined): number {
  if (!cart) return 0;
  if (typeof cart.subTotalXaf === 'number') return cart.subTotalXaf;
  const items = cart.items ?? [];
  return items.reduce((sum, item, i) => sum + cartLineTotal(item, i, items), 0);
}

/** « Alloco · Œuf ×2 (+600) » — le supplément est déjà dans le prix de la ligne. */
export function formatLineOptions(
  options: ReadonlyArray<{ name?: string; optionName?: string; quantity: number; priceDeltaXaf: number }>,
  formatAmount: (n: number) => string = (n) => String(n),
): string {
  return options
    .map((o) => {
      const name = o.name ?? o.optionName ?? 'Option';
      const label = o.quantity > 1 ? `${name} ×${o.quantity}` : name;
      const delta = o.priceDeltaXaf * o.quantity;
      return delta > 0 ? `${label} (+${formatAmount(delta)})` : label;
    })
    .join(' · ');
}

/** Le produit s'ajoute-t-il par un choix d'options ? */
export function hasModifiers(product: { modifierGroups?: ModifierGroup[] }): boolean {
  return (product.modifierGroups?.length ?? 0) > 0;
}

/** État immuable du sélecteur : optionId → quantité. */
export type ModifierSelection = Readonly<Record<string, number>>;

function countIn(group: ModifierGroup, selection: ModifierSelection): number {
  return group.options.filter((o) => selection[o.id] !== undefined).length;
}

/**
 * Choisit ou retire une option. Rend la nouvelle sélection, ou `null` si le
 * geste est refusé (option en rupture, plafond du groupe atteint).
 */
export function toggleModifier(
  selection: ModifierSelection,
  group: ModifierGroup,
  option: ModifierOption,
): ModifierSelection | null {
  if (!option.isAvailable) return null;
  const next: Record<string, number> = { ...selection };
  if (next[option.id] !== undefined) {
    // Choix unique obligatoire : on change d'avis en choisissant une autre
    // option, comme un bouton radio — on ne le décoche pas.
    if (group.maxSelect === 1 && group.minSelect >= 1) return selection;
    delete next[option.id];
    return next;
  }
  if (group.maxSelect === 1) {
    for (const other of group.options) delete next[other.id];
    next[option.id] = 1;
    return next;
  }
  if (countIn(group, selection) >= group.maxSelect) return null;
  next[option.id] = 1;
  return next;
}

/** Change la quantité d'une option choisie, bornée à `1..maxQuantity`. */
export function setModifierQuantity(
  selection: ModifierSelection,
  option: ModifierOption,
  quantity: number,
): ModifierSelection {
  if (selection[option.id] === undefined) return selection;
  return { ...selection, [option.id]: Math.min(Math.max(quantity, 1), option.maxQuantity) };
}

/** Libellé du bouton quand un groupe obligatoire est incomplet, `null` sinon. */
export function modifierBlockingReason(
  groups: ModifierGroup[],
  selection: ModifierSelection,
): string | null {
  const group = groups.find((g) => countIn(g, selection) < g.minSelect);
  if (!group) return null;
  return group.minSelect > 1
    ? `Choisissez ${group.minSelect} × « ${group.name} »`
    : `Choisissez « ${group.name} »`;
}

/** Ce qui part au serveur, dans l'ordre de la carte : identifiants et quantités. */
export function toSelectedOptions(
  groups: ModifierGroup[],
  selection: ModifierSelection,
): SelectedOption[] {
  return groups.flatMap((g) =>
    g.options
      .filter((o) => selection[o.id] !== undefined)
      .map((o) => ({ optionId: o.id, quantity: selection[o.id] })),
  );
}

/** Valeur unitaire des suppléments choisis — affichage seulement. */
export function selectedOptionsValue(
  groups: ModifierGroup[],
  selection: ModifierSelection,
): number {
  return groups
    .flatMap((g) => g.options)
    .reduce((sum, o) => sum + (selection[o.id] ?? 0) * o.priceDeltaXaf, 0);
}

/** Nombre d'options choisies, quantités comprises (analytics `options_count`). */
export function selectedOptionsCount(selection: ModifierSelection): number {
  return Object.values(selection).reduce((sum, q) => sum + q, 0);
}

export type { CartLineOption };
