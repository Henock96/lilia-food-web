import type {
  Cart,
  CartItem,
  CartLineOption,
  ModifierGroup,
  Product,
  ProductVariant,
  SelectedOption,
} from '@lilia/types';
import { coverImage, type ModifierSelection } from '@lilia/utils';

/**
 * Le panier d'un visiteur qui n'a pas encore de compte.
 *
 * Le panier de Lilia Food vit sur le serveur, et ses routes exigent un jeton :
 * un visiteur ne pouvait rien ajouter, et la connexion lui était demandée avant
 * même qu'il ait choisi. Ce magasin lui permet de composer d'abord ; tout est
 * versé dans son panier serveur à la connexion (`guest-cart-adoption.ts`).
 *
 * ⚠️ **Rien ici ne fait autorité.** Le prix et le stock sont ceux vus à l'ajout,
 * pour l'affichage ; le prix ne part jamais au serveur, qui revalide chaque
 * ligne au versement et chiffre seul la commande.
 *
 * Les **menus** en sont exclus : leur composition n'est connue que du serveur.
 */
export const GUEST_CART_KEY = 'lilia-guest-cart-v1';

/** Stock quotidien et prix bougent : au-delà, le panier ne dit plus rien de vrai. */
export const GUEST_CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** `MAX_ITEM_QUANTITY` du serveur. */
export const MAX_GUEST_LINE_QUANTITY = 50;

export interface GuestCartLine {
  /** Format + sélection d'options : deux sélections font deux lignes, comme au serveur. */
  id: string;
  productId: string;
  variantId: string;
  quantite: number;
  options: SelectedOption[];
  nom: string;
  imageUrl: string | null;
  variantLabel: string | null;
  /** Affichage seulement. */
  unitPriceXaf: number;
  restaurantId: string;
  madeToOrder: boolean;
  /** `null` = illimité, à ne jamais confondre avec 0 = épuisé. */
  stockRestant: number | null;
  stockConsumption: number;
  optionDetails: CartLineOption[];
}

export type GuestAddResult =
  | { status: 'added'; lines: GuestCartLine[] }
  | { status: 'other_vendor' | 'limit'; lines: GuestCartLine[] };

function lineId(variantId: string, options: SelectedOption[]): string {
  const signature = options
    .map((o) => `${o.optionId}:${o.quantity}`)
    .sort()
    .join(',');
  return `${variantId}|${signature}`;
}

export function buildGuestLine(
  product: Product,
  variant: ProductVariant,
  quantite: number,
  options: SelectedOption[],
  optionDetails: CartLineOption[],
): GuestCartLine {
  const optionsValue = optionDetails.reduce((sum, o) => sum + o.priceDeltaXaf * o.quantity, 0);
  return {
    id: lineId(variant.id, options),
    productId: product.id,
    variantId: variant.id,
    quantite,
    options,
    nom: product.nom,
    imageUrl: coverImage(product) ?? null,
    variantLabel: variant.label ?? null,
    unitPriceXaf: variant.prix + optionsValue,
    restaurantId: product.restaurantId,
    madeToOrder: product.madeToOrder === true,
    stockRestant: product.stockRestant ?? null,
    stockConsumption: variant.stockConsumption ?? 1,
    optionDetails,
  };
}

/** Détail lisible des options choisies, pour l'affichage du tiroir. */
export function guestLineOptions(
  groups: ModifierGroup[],
  selection: ModifierSelection,
): CartLineOption[] {
  return groups.flatMap((g) =>
    g.options
      .filter((o) => selection[o.id] !== undefined)
      .map((o) => ({
        optionId: o.id,
        groupId: g.id,
        groupName: g.name,
        name: o.name,
        priceDeltaXaf: o.priceDeltaXaf,
        quantity: selection[o.id],
      })),
  );
}

/**
 * Le stock est porté par le **produit** : deux formats puisent dans le même
 * compteur, chacun pesant `quantite × stockConsumption`.
 */
function withinLimits(lines: GuestCartLine[]): boolean {
  return lines.every((line) => {
    if (line.quantite > MAX_GUEST_LINE_QUANTITY) return false;
    if (line.stockRestant === null) return true;
    const engaged = lines
      .filter((l) => l.productId === line.productId)
      .reduce((sum, l) => sum + l.quantite * l.stockConsumption, 0);
    return engaged <= line.stockRestant;
  });
}

export function addGuestLine(lines: GuestCartLine[], line: GuestCartLine): GuestAddResult {
  if (lines.length > 0 && lines[0].restaurantId !== line.restaurantId) {
    return { status: 'other_vendor', lines };
  }
  const existing = lines.find((l) => l.id === line.id);
  const next = existing
    ? lines.map((l) => (l.id === line.id ? { ...l, quantite: l.quantite + line.quantite } : l))
    : [...lines, line];
  return withinLimits(next) ? { status: 'added', lines: next } : { status: 'limit', lines };
}

export function setGuestLineQuantity(
  lines: GuestCartLine[],
  id: string,
  quantite: number,
): GuestCartLine[] {
  if (quantite <= 0) return lines.filter((l) => l.id !== id);
  const next = lines.map((l) => (l.id === id ? { ...l, quantite } : l));
  return withinLimits(next) ? next : lines;
}

export function canIncreaseGuestLine(lines: GuestCartLine[], id: string): boolean {
  const line = lines.find((l) => l.id === id);
  return !!line && setGuestLineQuantity(lines, id, line.quantite + 1) !== lines;
}

export function serializeGuestCart(lines: GuestCartLine[], now: number): string {
  return JSON.stringify({ savedAt: now, lines });
}

function isValidLine(value: unknown): value is GuestCartLine {
  const line = value as Partial<GuestCartLine> | null;
  return (
    typeof line === 'object' &&
    line !== null &&
    typeof line.id === 'string' &&
    typeof line.productId === 'string' &&
    typeof line.variantId === 'string' &&
    typeof line.nom === 'string' &&
    typeof line.restaurantId === 'string' &&
    typeof line.unitPriceXaf === 'number' &&
    Number.isInteger(line.quantite) &&
    (line.quantite as number) > 0 &&
    Array.isArray(line.options) &&
    Array.isArray(line.optionDetails)
  );
}

/**
 * Tout contenu illisible vaut « pas de panier » : le stockage peut être vidé,
 * tronqué ou modifié à la main, et un écran qui refuse de s'ouvrir n'est pas un
 * état acceptable. Le serveur revalide de toute façon chaque ligne.
 */
export function parseGuestCart(raw: string | null, now: number): GuestCartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { savedAt?: unknown; lines?: unknown } | null;
    if (typeof parsed?.savedAt !== 'number' || !Array.isArray(parsed.lines)) return [];
    if (now - parsed.savedAt > GUEST_CART_TTL_MS) return [];
    return parsed.lines.filter(isValidLine);
  } catch {
    return [];
  }
}

/** Le `localStorage` peut lever (navigation privée, stockage bloqué). */
export function readGuestCart(): GuestCartLine[] {
  try {
    return parseGuestCart(window.localStorage.getItem(GUEST_CART_KEY), Date.now());
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestCartLine[]): void {
  try {
    if (lines.length === 0) window.localStorage.removeItem(GUEST_CART_KEY);
    else window.localStorage.setItem(GUEST_CART_KEY, serializeGuestCart(lines, Date.now()));
  } catch {
    // Le panier reste juste à l'écran pour cette visite.
  }
}

/**
 * Une seule notion de panier à l'écran : le tiroir, l'en-tête et les règles de
 * conflit lisent la même forme, que le panier vienne du serveur ou du navigateur.
 */
export function guestCartAsCart(lines: GuestCartLine[]): Cart {
  const items = lines.map(
    (line) =>
      ({
        id: line.id,
        cartId: 'guest',
        productId: line.productId,
        product: {
          id: line.productId,
          nom: line.nom,
          imageUrl: line.imageUrl,
          restaurantId: line.restaurantId,
          madeToOrder: line.madeToOrder,
          stockRestant: line.stockRestant,
        },
        menuId: null,
        variantId: line.variantId,
        variant: { id: line.variantId, label: line.variantLabel, prix: line.unitPriceXaf },
        quantite: line.quantite,
        itemKey: null,
        createdAt: '',
        options: line.optionDetails,
        unitPriceXaf: line.unitPriceXaf,
        lineTotalXaf: line.unitPriceXaf * line.quantite,
      }) as unknown as CartItem,
  );
  return {
    id: 'guest',
    userId: '',
    items,
    createdAt: '',
    updatedAt: '',
    subTotalXaf: items.reduce((sum, item) => sum + (item.lineTotalXaf ?? 0), 0),
  };
}
