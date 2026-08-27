'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@lilia/api-client';
import { formatCurrency } from '@lilia/utils';

export function CartDrawer() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { isOpen, closeCart } = useCartStore();
  const { data: cart } = useCart(token);
  const updateItem = useUpdateCartItem(token);
  const removeItem = useRemoveCartItem(token);

  const items = cart?.items ?? [];
  const subTotal = items.reduce((sum, item) => sum + (item.variant?.prix ?? 0) * item.quantite, 0);

  function handleCheckout() {
    closeCart();
    router.push('/panier');
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
                {items.length > 0 && (
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
              {items.length === 0 ? (
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
                          <p className="text-sm font-bold text-tomato-700 mt-0.5">
                            {formatCurrency((item.variant?.prix ?? 0) * item.quantite)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            aria-label="Diminuer la quantité"
                            onClick={() => item.quantite === 1 ? removeItem.mutate(item.id) : updateItem.mutate({ itemId: item.id, quantite: item.quantite - 1 })}
                            className="w-6 h-6 bg-white border border-cream-300 hover:bg-cream-200 rounded-full flex items-center justify-center transition-colors active:scale-90"
                          >
                            {item.quantite === 1 ? <Trash2 className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3 text-ink-700" />}
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-ink-900">{item.quantite}</span>
                          <button
                            aria-label="Augmenter la quantité"
                            onClick={() => updateItem.mutate({ itemId: item.id, quantite: item.quantite + 1 })}
                            className="w-6 h-6 bg-tomato-100 hover:bg-tomato-100 rounded-full flex items-center justify-center transition-colors active:scale-90"
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
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-cream-200 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-ink-500">Sous-total</span>
                  <span className="font-bold text-ink-900">{formatCurrency(subTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-tomato-600 hover:bg-tomato-700 text-white font-semibold rounded-2xl transition-all shadow-sm shadow-tomato-100/50 active:scale-[0.98]"
                >
                  Voir le panier
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
