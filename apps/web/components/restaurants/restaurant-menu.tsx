'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import type { Restaurant, Product, ProductVariant } from '@lilia/types';
import { formatCurrency, cn, hasPreorderConflict, isPreorderCart, coverImage } from '@lilia/utils';
import { useAuthStore } from '@/store/auth';
import { useAddToCart, useClearCart, useCart } from '@lilia/api-client';
import { toast } from 'sonner';
import { CartModeConflictDialog } from '@/components/cart/cart-mode-conflict-dialog';

interface RestaurantMenuProps {
  restaurant: Restaurant;
}

export function RestaurantMenu({ restaurant }: RestaurantMenuProps) {
  const products = restaurant.products ?? [];

  const categories = Array.from(
    new Map(
      products
        .filter((p) => p.category)
        .map((p) => [p.category!.id, p.category!]),
    ).values(),
  );
  const uncategorized = products.filter((p) => !p.category);

  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-ink-500">
        <p className="font-medium text-ink-700">Aucun produit disponible</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky category bar */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-cream-100/95 backdrop-blur-sm border-b border-cream-300 mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeCategory === cat.id
                    ? 'bg-tomato-600 text-white shadow-sm'
                    : 'bg-white text-ink-700 border border-cream-300 hover:border-tomato-600',
                )}
              >
                {cat.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products by category */}
      <div className="flex flex-col gap-8">
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.categoryId === cat.id);
          if (catProducts.length === 0) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4">{cat.nom}</h2>
              <div className="flex flex-col gap-3">
                {catProducts.map((product) => (
                  <ProductItem key={product.id} product={product} restaurantOpen={restaurant.isOpen} />
                ))}
              </div>
            </section>
          );
        })}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Autres plats</h2>
            <div className="flex flex-col gap-3">
              {uncategorized.map((product) => (
                <ProductItem key={product.id} product={product} restaurantOpen={restaurant.isOpen} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ProductItem({ product, restaurantOpen }: { product: Product; restaurantOpen: boolean }) {
  const { token } = useAuthStore();
  const addToCart = useAddToCart(token);
  const clearCart = useClearCart(token);
  const { data: cart } = useCart(token);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]!);
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stockRestant !== null && product.stockRestant === 0;
  const canAdd = restaurantOpen && !isOutOfStock && !!selectedVariant;
  const cover = coverImage(product);

  async function handleAdd() {
    if (!token) {
      toast.error('Connectez-vous pour ajouter au panier');
      return;
    }
    if (!selectedVariant) return;

    if (hasPreorderConflict(cart, product)) {
      setConflictOpen(true);
      return;
    }

    try {
      await addToCart.mutateAsync({ productId: product.id, variantId: selectedVariant.id, quantite: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success(`${product.nom} ajouté au panier`);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? '';
      if (msg.toLowerCase().includes('restaurant') || msg.toLowerCase().includes('vider')) {
        toast.error('Votre panier contient des plats d\'un autre restaurant.', {
          action: {
            label: 'Vider et ajouter',
            onClick: async () => {
              try {
                await clearCart.mutateAsync();
                await addToCart.mutateAsync({ productId: product.id, variantId: selectedVariant.id, quantite: 1 });
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
                toast.success(`${product.nom} ajouté au panier`);
              } catch {
                toast.error('Erreur lors de l\'ajout');
              }
            },
          },
        });
      } else {
        toast.error(msg || 'Impossible d\'ajouter au panier');
      }
    }
  }

  async function handleConfirmConflict() {
    setConflictOpen(false);
    if (!selectedVariant) return;
    try {
      await clearCart.mutateAsync();
      await addToCart.mutateAsync({ productId: product.id, variantId: selectedVariant.id, quantite: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success(`Panier vidé. ${product.nom} ajouté.`);
    } catch {
      toast.error('Erreur lors du remplacement du panier');
    }
  }

  return (
    <motion.div
      layout
      className="bg-white rounded-xl border border-cream-300 p-4 flex gap-4 transition-all hover:shadow-sm"
    >
      {/* Image — seule l'image est atténuée pour un produit épuisé : mettre
          l'opacité sur toute la carte assombrirait aussi le badge « Rupture »
          (fond ink-500 + texte blanc) et ferait chuter son contraste
          bien sous 4,5:1 (calculé ≈2,6:1 avec le voisinage crème) — voir
          rapport de tâche. */}
      {cover && (
        <div
          className={cn(
            'relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-cream-200',
            isOutOfStock && 'opacity-60',
          )}
        >
          <Image src={cover} alt={product.nom} fill sizes="96px" className="object-cover" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-display font-bold text-ink-900 text-sm leading-snug">{product.nom}</h3>
            {product.description && (
              <p className="text-ink-500 text-xs mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>
          {isOutOfStock && (
            <span className="px-2 py-0.5 bg-ink-500 text-white text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              Rupture
            </span>
          )}
        </div>

        {/* Variants */}
        {product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  selectedVariant?.id === v.id
                    ? 'bg-white border-tomato-600 text-tomato-700 font-semibold'
                    : 'bg-white border-cream-300 text-ink-700 hover:border-tomato-600',
                )}
              >
                {v.label ?? 'Standard'} — {formatCurrency(v.prix)}
              </button>
            ))}
          </div>
        )}

        {/* Prix + Add */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-tomato-700 font-extrabold">
            {formatCurrency(selectedVariant?.prix ?? product.prixOriginal)}
          </span>

          <motion.button
            onClick={handleAdd}
            disabled={!canAdd || addToCart.isPending}
            whileTap={canAdd ? { scale: 0.9 } : {}}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all',
              canAdd
                ? added
                  ? 'bg-success text-white'
                  : 'bg-tomato-600 hover:bg-tomato-700 text-white shadow-sm'
                : 'bg-cream-200 text-ink-300 cursor-not-allowed',
            )}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Plus className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      <CartModeConflictDialog
        open={conflictOpen}
        cartIsPreorder={isPreorderCart(cart)}
        incomingProductName={product.nom}
        onConfirm={handleConfirmConflict}
        onCancel={() => setConflictOpen(false)}
      />
    </motion.div>
  );
}
