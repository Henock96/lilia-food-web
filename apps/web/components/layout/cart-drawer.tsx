'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import { useCartStore } from '@/store/cart';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@lilia/api-client';
import { formatCurrency } from '@lilia/utils';
import { toast } from 'sonner';
import { collectionReadState, runVisibleMutation, mutationErrorMessage } from '@/lib/account-feedback';
import { analytics } from '@/lib/analytics';
import { useDialogFocus } from '@/lib/dialog-focus';
import { canIncreaseGuestLine } from '@/lib/guest-cart';
import { useCartView } from '@/lib/use-cart-view';
import { useGuestCartStore } from '@/store/guest-cart';
import { CartLineDetails } from '@/components/cart/cart-line-details';
import { cartLineUnitPrice, cartSubtotal } from '@lilia/utils';

export function CartDrawer() {
  const router = useRouter();
  const { token, isLoading: sessionLoading } = useAuthSession();
  const { isOpen, closeCart } = useCartStore();
  const dialogRef = useDialogFocus<HTMLDivElement>(isOpen, closeCart);
  const isCurrentSession = useSessionGuard();
  const { data: serverCart, isLoading, isError, isFetching, isPaused, refetch } = useCart(token);
  const cart = useCartView(token);
  const guestLines = useGuestCartStore((s) => s.lines);
  const updateItem = useUpdateCartItem(token);
  const removeItem = useRemoveCartItem(token);
  const gate = useRef(false);
  const busy = updateItem.isPending || removeItem.isPending || updateItem.isPaused || removeItem.isPaused || isFetching || isPaused;
  // Le visiteur a son panier local : rien à charger, rien qui puisse échouer.
  const guest = !sessionLoading && !token;
  const readState = sessionLoading ? 'loading' : guest ? 'ready' : collectionReadState(serverCart, isLoading, isError || isPaused);
  function changeQuantity(itemId: string, quantite: number) {
    if (guest) {
      useGuestCartStore.getState().setQuantity(itemId, quantite);
      return;
    }
    if (busy) return;
    void runVisibleMutation({ gate, isCurrent: isCurrentSession,
      run: () => quantite === 0 ? removeItem.mutateAsync(itemId) : updateItem.mutateAsync({ itemId, quantite }),
      onError: (error) => toast.error(mutationErrorMessage(error, 'Impossible de modifier le panier. Réessayez après vérification de votre connexion.')),
    });
  }

  const items = cart?.items ?? [];
  // F3-09 — sous-total serveur : options comprises, menu compté une fois.
  const subTotal = cartSubtotal(cart);

  // `view_cart` — le tiroir est la seconde surface de consultation du panier
  // sur le web (l'autre étant `/panier`). Les deux émettent : ouvrir le tiroir
  // *est* une consultation du panier, et l'ignorer sous-estimerait cette étape
  // pour tous les clients qui n'ouvrent jamais la page dédiée.
  //
  // ⚠️ Conséquence assumée, documentée dans `docs/analytics.md` : un client qui
  // ouvre le tiroir **puis** la page émet deux `view_cart`. Le tunnel se lit en
  // utilisateurs, où il n'en compte qu'un ; en nombre d'événements, le web est
  // structurellement au-dessus du mobile sur cette seule étape.
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    analytics.track('view_cart', { item_count: items.length, cart_total: subTotal });
  }, [isOpen, items.length, subTotal]);

  function handleCheckout() {
    closeCart();
    // Le panier du visiteur est versé à la connexion, puis retrouvé sur `/panier`.
    router.push(guest ? '/connexion?redirect=/panier' : '/panier');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            aria-hidden
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            ref={dialogRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-label="Panier"
            aria-modal="true"
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-tomato-700" />
                <h2 className="font-bold text-ink-900 text-lg">Mon panier</h2>
                {readState === 'ready' && items.length > 0 && (
                  <span className="text-xs font-semibold bg-tomato-100 text-tomato-700 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                aria-label="Fermer le panier"
                className="p-2 text-ink-500 hover:text-ink-700 hover:bg-cream-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {readState === 'loading' ? (
                <p role="status">Chargement du panier…</p>
              ) : readState === 'error' ? (
                <div role="alert">
                  <p>Impossible de charger votre panier. Son contenu ne peut pas être confirmé.</p>
                  <button type="button" disabled={isFetching} onClick={() => void refetch()}
                    className="mt-3 text-tomato-700 underline disabled:opacity-50">Réessayer</button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  {/* Empty state illustration */}
                  <div className="w-20 h-20 bg-cream-200 rounded-3xl flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-ink-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">Votre panier est vide</p>
                    <p className="text-ink-500 text-sm mt-1">Ajoutez des plats depuis un restaurant</p>
                  </div>
                  <button
                    onClick={() => { closeCart(); router.push('/restaurants'); }}
                    className="px-5 py-2.5 bg-tomato-600 text-white text-sm font-medium rounded-2xl hover:bg-tomato-700 transition-colors active:scale-95"
                  >
                    Voir les restaurants
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-3 bg-cream-100 rounded-2xl p-3"
                      >
                        {item.product?.imageUrl && (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.nom}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{item.product?.nom}</p>
                          {item.variant?.label && (
                            <p className="text-xs text-ink-500">{item.variant.label}</p>
                          )}
                          <CartLineDetails item={item} />
                          <p className="text-sm font-bold text-tomato-700 mt-0.5">
                            {formatCurrency(cartLineUnitPrice(item) * item.quantite)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            aria-label="Diminuer la quantité"
                            disabled={!guest && busy}
                            onClick={() => changeQuantity(item.id, item.quantite - 1)}
                            className="w-6 h-6 bg-white border border-cream-300 hover:bg-cream-200 rounded-full flex items-center justify-center transition-colors active:scale-90"
                          >
                            {item.quantite === 1 ? <Trash2 className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3 text-ink-700" />}
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-ink-900">{item.quantite}</span>
                          <button
                            aria-label="Augmenter la quantité"
                            disabled={guest ? !canIncreaseGuestLine(guestLines, item.id) : busy}
                            onClick={() => changeQuantity(item.id, item.quantite + 1)}
                            className="w-6 h-6 bg-tomato-100 hover:bg-cream-200 rounded-full flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Plus className="w-3 h-3 text-tomato-700" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {readState === 'ready' && items.length > 0 && (
              <div className="px-5 py-4 border-t border-cream-200 bg-white">
                <div className={`flex justify-between items-center ${guest ? 'mb-1' : 'mb-4'}`}>
                  <span className="text-sm text-ink-500">{guest ? 'Sous-total indicatif' : 'Sous-total'}</span>
                  <span className="font-bold text-ink-900">{formatCurrency(subTotal)}</span>
                </div>
                {guest && (
                  <p className="mb-4 text-xs text-ink-500">
                    Prix vus à l’ajout. Le montant exact, avec les frais, s’affiche après la connexion, avant tout paiement.
                  </p>
                )}
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-tomato-600 hover:bg-tomato-700 text-white font-semibold rounded-2xl transition-all shadow-sm shadow-tomato-100/50 active:scale-[0.98]"
                >
                  {guest ? 'Se connecter pour commander' : 'Voir le panier'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
