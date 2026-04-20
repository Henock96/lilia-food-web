'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, Check } from 'lucide-react';
import type { Restaurant, Product, ProductVariant } from '@lilia/types';
import { formatCurrency, cn } from '@lilia/utils';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useAddToCart } from '@lilia/api-client';
import { toast } from 'sonner';

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
      <div className="text-center py-16 text-zinc-400">
        <p className="font-medium text-zinc-600">Aucun produit disponible</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky category bar */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-zinc-50/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-zinc-200 dark:border-dark-border mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white dark:bg-dark-surface text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-dark-border hover:border-zinc-300 dark:hover:border-zinc-600',
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
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg mb-4">{cat.nom}</h2>
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
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg mb-4">Autres plats</h2>
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
  const { openCart } = useCartStore();
  const addToCart = useAddToCart(token);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]!);
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stockRestant !== null && product.stockRestant === 0;
  const canAdd = restaurantOpen && !isOutOfStock && !!selectedVariant;

  async function handleAdd() {
    if (!token) {
      toast.error('Connectez-vous pour ajouter au panier');
      return;
    }
    if (!selectedVariant) return;

    try {
      await addToCart.mutateAsync({ productId: product.id, variantId: selectedVariant.id, quantite: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success(`${product.nom} ajouté au panier`);
    } catch {
      toast.error('Impossible d\'ajouter au panier');
    }
  }

  return (
    <motion.div
      layout
      className={cn(
        'bg-white dark:bg-dark-card rounded-xl border border-zinc-100 dark:border-dark-border p-4 flex gap-4 transition-all hover:border-zinc-200 dark:hover:border-zinc-600 hover:shadow-sm dark:hover:shadow-black/20',
        isOutOfStock && 'opacity-60',
      )}
    >
      {/* Image */}
      {product.imageUrl && (
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-dark-surface">
          <img src={product.imageUrl} alt={product.nom} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">{product.nom}</h3>
            {product.description && (
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>
          {isOutOfStock && (
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-dark-surface text-zinc-500 dark:text-zinc-400 text-xs rounded-full whitespace-nowrap flex-shrink-0">
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
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                    : 'bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
                )}
              >
                {v.label ?? 'Standard'} — {formatCurrency(v.prix)}
              </button>
            ))}
          </div>
        )}

        {/* Prix + Add */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
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
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
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
    </motion.div>
  );
}
