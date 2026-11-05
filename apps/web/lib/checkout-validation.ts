import type { Adresse, Cart } from '@lilia/types';
import { isVerifiedCheckoutQuote } from '@lilia/api-client';

/** Cache identity includes every client-visible change that can affect a quote. */
export function checkoutCartSignature(cart: Cart | undefined, address: Adresse | null): string {
  if (!cart?.items.length) return '';
  return JSON.stringify({
    cartId: cart.id, updatedAt: cart.updatedAt, subTotal: cart.subTotalXaf,
    address,
    items: cart.items.map((line) => ({
      id: line.id, productId: line.productId, variantId: line.variantId, menuId: line.menuId,
      quantity: line.quantite, options: line.options, optionsSignature: line.optionsSignature,
      unitPrice: line.unitPriceXaf, lineTotal: line.lineTotalXaf, issue: line.issue,
      variantPrice: line.variant?.prix,
    })),
  });
}

export function checkoutQuoteReady(input: {
  quote: unknown;
  restaurantId: string;
  hasInputs: boolean;
  success: boolean;
  fetching: boolean;
  placeholder: boolean;
  cartUpdating: boolean;
}): boolean {
  return input.hasInputs && input.success && !input.fetching && !input.placeholder && !input.cartUpdating &&
    isVerifiedCheckoutQuote(input.quote) && input.quote.restaurantId === input.restaurantId;
}

/**
 * Premier motif qui empêche de commander, ou `null`.
 *
 * Une seule écriture de la condition du bouton : sur mobile, le bouton vit dans
 * une barre fixe, loin du récapitulatif qui explique pourquoi il est grisé. Le
 * devis vient en dernier : il dépend de ce que le client doit d'abord compléter.
 */
export function checkoutBlocker(input: {
  /** Des lignes du visiteur attendent encore leur versement au panier serveur. */
  guestCartPending: boolean;
  maintenance: string | null;
  vendorServesNobody: boolean;
  isEmpty: boolean;
  minimumError: string | null;
  needsAddress: boolean;
  needsSlot: boolean;
  phoneValid: boolean;
  quoteReady: boolean;
}): string | null {
  if (input.guestCartPending) return 'Reprise de votre panier…';
  if (input.maintenance) return input.maintenance;
  if (input.vendorServesNobody) return 'Ce vendeur ne prend pas de commande pour le moment.';
  if (input.isEmpty) return 'Votre panier est vide.';
  if (input.minimumError) return input.minimumError;
  if (input.needsAddress) return 'Sélectionnez une adresse de livraison.';
  if (input.needsSlot) return 'Choisissez un créneau de retrait.';
  if (!input.phoneValid) return 'Renseignez un numéro de contact valide.';
  if (!input.quoteReady) return 'Vérification du montant de votre commande…';
  return null;
}

/** Recheck live cache at click time, including invalidation before React rerenders. */
export function checkoutCacheCurrent(state: {
  data: unknown; status: string; fetchStatus: string; isInvalidated: boolean;
} | undefined, renderedQuote: unknown): boolean {
  return !!state && state.status === 'success' && state.fetchStatus === 'idle' &&
    !state.isInvalidated && state.data === renderedQuote && isVerifiedCheckoutQuote(state.data);
}
