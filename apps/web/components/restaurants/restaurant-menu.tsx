'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import type { Restaurant, Product, ProductVariant } from '@lilia/types';
import {
  formatCurrency,
  priceLabel,
  cn,
  hasPreorderConflict,
  isPreorderCart,
  coverImage,
} from '@lilia/utils';
import { useAuthStore } from '@/store/auth';
import { useAddToCart, useClearCart, useCart } from '@lilia/api-client';
import { analytics } from '@/lib/analytics';
import { toast } from 'sonner';
import { CartModeConflictDialog } from '@/components/cart/cart-mode-conflict-dialog';
import { buildMenuModel, menuItemState, UNCATEGORIZED_LABEL } from '@/lib/menu-model';

interface RestaurantMenuProps {
  restaurant: Restaurant;
}

export function RestaurantMenu({ restaurant }: RestaurantMenuProps) {
  // Le rangement de la carte vit dans `lib/menu-model.ts`, donc testable sans
  // rendre le composant. Il ne calcule aucune règle métier : le serveur a déjà
  // décidé de tout ce qui relève du commerce.
  const { sections, uncategorized, isEmpty } = buildMenuModel(restaurant);

  const [activeCategory, setActiveCategory] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  if (isEmpty) {
    return (
      <div className="text-center py-16 text-ink-500">
        <p className="font-medium text-ink-700">Aucun produit disponible</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky category bar */}
      {sections.length > 0 && (
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-cream-100/95 backdrop-blur-sm border-b border-cream-300 mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {sections.map((cat) => (
              <button
                key={cat.id}
                // Le bouton ne faisait que se colorer : l'ancre `#cat-<id>`
                // existait déjà en bas, personne ne l'atteignait. Sur une carte
                // à six sections, c'est toute l'utilité de la barre.
                onClick={() => {
                  setActiveCategory(cat.id);
                  document
                    .getElementById(`cat-${cat.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
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
        {sections.map((section) => (
          <section key={section.id} id={`cat-${section.id}`}>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-4">{section.nom}</h2>
            <div className="flex flex-col gap-3">
              {section.products.map((product) => (
                <ProductItem key={product.id} product={product} restaurantOpen={restaurant.isOpen} />
              ))}
            </div>
          </section>
        ))}
        {uncategorized.length > 0 && (
          <section>
            {/* « Autres », et non « Autres plats » : sur une boulangerie ou une
                boutique de boissons, « plats » est simplement faux. L'application
                disait déjà « Autres ». */}
            <h2 className="font-display text-lg font-bold text-ink-900 mb-4">{UNCATEGORIZED_LABEL}</h2>
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
  /**
   * Variante retenue pour l'ajout au panier.
   *
   * `null` tant que le client n'a pas choisi, **dès qu'il y a plusieurs
   * formats** : la carte annonce alors « À partir de X » et le bouton reste
   * inactif. C'est ce qui garantit que le prix affiché est toujours celui qui
   * sera facturé.
   *
   * Auparavant l'état était initialisé à `product.variants[0]` — c'est-à-dire à
   * la première ligne rendue par PostgreSQL, sans `ORDER BY`, donc à un format
   * qui pouvait changer après une simple édition du produit. Un client
   * commandait « Petite » ou « Grande » selon l'humeur du tas.
   *
   * Un produit à format unique reste sélectionné d'office : il n'y a rien à
   * choisir, et imposer un clic serait une friction sans contrepartie.
   */
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length === 1 ? product.variants[0]! : null,
  );
  const [added, setAdded] = useState(false);

  // État d'achat calculé au même endroit que le reste de la carte, et sans
  // recalculer une règle du serveur : `availableNow` est son verdict horaire,
  // `stockRestant` sa convention (`null` = illimité, `0` = épuisé).
  const { orderable, badge } = menuItemState(product, restaurantOpen);
  const isOutOfStock = badge === 'rupture';
  const canAdd = orderable && !!selectedVariant;
  const cover = coverImage(product);

  /**
   * `add_to_cart` — émis **après** que le serveur a accepté l'ajout, jamais au
   * clic. Le backend refuse un produit épuisé, un vendeur fermé, ou un mélange
   * de modes dans un même panier : compter le clic ferait apparaître des ajouts
   * qui n'ont jamais eu lieu, et le tunnel décrocherait sans raison visible
   * entre `add_to_cart` et `view_cart`.
   *
   * Les trois chemins d'ajout de cet écran (ajout direct, reprise après « vider
   * le panier », résolution du conflit de mode) passent par ici : l'oubli d'un
   * seul rendrait le comptage dépendant de la manière dont le client s'y est
   * pris.
   */
  function trackAdded() {
    analytics.track('add_to_cart', {
      product_id: product.id,
      product_name: product.nom,
      restaurant_id: product.restaurantId,
      price: selectedVariant?.prix ?? product.prixOriginal,
      quantity: 1,
    });
  }

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
      trackAdded();
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
                trackAdded();
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
      trackAdded();
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
        <Link
          href={`/produits/${product.id}`}
          aria-label={`Voir ${product.nom}`}
          className={cn(
            'relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-cream-200',
            badge && 'opacity-60',
          )}
        >
          <Image src={cover} alt={product.nom} fill sizes="96px" className="object-cover" />
        </Link>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          {/* Le titre et l'image mènent à la fiche ; le bouton « + » reste.
              Une carte est une liste dans laquelle on commande vite : forcer
              le détour par la fiche ferait payer deux clics de plus à chaque
              plat. La description est tronquée ici — c'est justement ce que la
              fiche existe pour montrer en entier. */}
          <div className="min-w-0">
            <Link href={`/produits/${product.id}`} className="group">
              <h3 className="font-display font-bold text-ink-900 text-sm leading-snug group-hover:text-tomato-700 transition-colors">
                {product.nom}
              </h3>
              {product.description && (
                <p className="text-ink-500 text-xs mt-1 line-clamp-2">{product.description}</p>
              )}
            </Link>
          </div>
          {/* « Rupture » et « Indisponible » sont deux informations
              différentes : la première est une conséquence des ventes du jour,
              la seconde une décision du vendeur ou un créneau fermé. Les
              confondre trompe le client comme le gestionnaire. */}
          {badge && (
            <span className="px-2 py-0.5 bg-ink-500 text-white text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              {badge === 'rupture' ? 'Rupture' : 'Indisponible'}
            </span>
          )}
        </div>

        {/* Variants */}
        {product.variants.length > 1 && (
          <div
            className="flex flex-wrap gap-1.5 mt-2"
            role="group"
            aria-label={`Format de ${product.nom}`}
          >
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                aria-pressed={selectedVariant?.id === v.id}
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

        {/* Prix + Add
            Une variante sélectionnée → son prix, puisque c'est celle qui part
            au panier. Sinon le prix d'appel (`priceLabel`), identique à celui
            de la fiche produit et de l'application. Auparavant cette ligne
            affichait `variants[0].prix` tandis que la fiche affichait le
            minimum : pour un plat à trois tailles, la carte pouvait annoncer
            1 500 XAF et la fiche 1 000 XAF. */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-tomato-700 font-extrabold">
            {selectedVariant
              ? formatCurrency(selectedVariant.prix)
              : priceLabel(product)}
          </span>

          <motion.button
            onClick={handleAdd}
            disabled={!canAdd || addToCart.isPending}
            // Dire POURQUOI le bouton est inactif : « désactivé » sans raison
            // ressemble à une panne. Les trois causes sont distinctes et
            // appellent trois gestes différents du client.
            aria-label={
              isOutOfStock
                ? `${product.nom} — en rupture`
                : !restaurantOpen
                  ? `${product.nom} — boutique fermée`
                  : !selectedVariant
                    ? `Choisissez un format pour ${product.nom}`
                    : `Ajouter ${product.nom} au panier`
            }
            title={
              !selectedVariant && restaurantOpen && !isOutOfStock
                ? 'Choisissez un format'
                : undefined
            }
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
