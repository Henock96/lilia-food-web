import type { Cart } from '@lilia/types';
import { isPreorderCart } from '@lilia/utils';
import type { GuestCartLine } from './guest-cart';

export type GuestAdoptionResult =
  /** `refused` : noms des articles que le catalogue n'accepte plus. */
  | { status: 'done'; refused: string[]; replaced: boolean }
  /** Interrompu par une panne : ce qui reste est conservé pour une reprise. */
  | { status: 'interrupted'; refused: string[]; replaced: boolean };

/**
 * Un refus du catalogue (épuisé, retiré, hors horaires) concerne cette ligne.
 * Une panne, elle, ne dit rien de l'article : la traiter pareil marquerait
 * « plus disponible » tout ce qui reste à verser. 401 : la session a sauté.
 */
function isCatalogRefusal(error: unknown): boolean {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    ![401, 408, 429].includes(status)
  );
}

/** Le serveur refuse un panier à deux vendeurs ou à deux modes. */
function incompatible(server: Cart, line: GuestCartLine): boolean {
  const first = server.items?.[0];
  if (!first) return false;
  return (
    first.product?.restaurantId !== line.restaurantId ||
    isPreorderCart(server) !== line.madeToOrder
  );
}

/**
 * Verse le panier du visiteur dans son panier serveur, à la connexion.
 *
 * Mêmes règles que `CartController.adoptGuestCart` de l'application :
 *
 *  - **Le visiteur gagne** si les deux paniers sont incompatibles : c'est celui
 *    qu'il regarde au moment de commander, l'autre est un reliquat.
 *  - Compatibles : les lignes s'ajoutent, `POST /cart/add` additionne.
 *  - **Ligne par ligne** : une rupture ne doit pas coûter les autres articles.
 *  - `save` après chaque ligne : rejouer une ligne déjà versée doublerait sa
 *    quantité, puisque le serveur additionne.
 *
 * Différence avec l'application : une ligne refusée est retirée et nommée. La
 * garder la ferait revenir sans explication à la connexion suivante.
 */
export async function adoptGuestCart({
  lines,
  readServerCart,
  clearServerCart,
  addLine,
  save,
}: {
  lines: GuestCartLine[];
  readServerCart: () => Promise<Cart | null | undefined>;
  clearServerCart: () => Promise<unknown>;
  addLine: (line: GuestCartLine) => Promise<unknown>;
  save: (remaining: GuestCartLine[]) => void;
}): Promise<GuestAdoptionResult> {
  const refused: string[] = [];
  let replaced = false;
  if (lines.length === 0) return { status: 'done', refused, replaced };

  try {
    const server = await readServerCart();
    if (server && incompatible(server, lines[0])) {
      await clearServerCart();
      replaced = true;
    }
  } catch {
    return { status: 'interrupted', refused, replaced };
  }

  for (let i = 0; i < lines.length; i++) {
    try {
      await addLine(lines[i]);
    } catch (error) {
      if (!isCatalogRefusal(error)) return { status: 'interrupted', refused, replaced };
      refused.push(lines[i].nom);
    }
    save(lines.slice(i + 1));
  }
  return { status: 'done', refused, replaced };
}
