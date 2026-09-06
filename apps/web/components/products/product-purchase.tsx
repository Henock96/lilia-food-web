'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Lock, Plus, ShoppingBag } from 'lucide-react';
import type { Product, ProductVariant, ProductVendorRef } from '@lilia/types';
import { useAddToCart, useCart, useClearCart } from '@lilia/api-client';
import { cn, formatCurrency, galleryImages, hasPreorderConflict, isPreorderCart } from '@lilia/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { analytics } from '@/lib/analytics';
import { computePurchaseState } from '@/lib/product-purchase-state';
import { ImageCarousel } from '@/components/ui';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { CartModeConflictDialog } from '@/components/cart/cart-mode-conflict-dialog';

/**
 * Bloc d'achat de la fiche produit : galerie, variante, quantité, ajout.
 *
 * **Le seul composant client de la page.** La description, les caractéristiques
 * et le référencement sont rendus sur le serveur ; seul ce qui réagit au doigt
 * du client arrive dans le bundle.
 *
 * Il redit sciemment les mêmes règles que `restaurant-menu.tsx` — conflit de
 * mode de panier, panier d'un autre vendeur, produit épuisé — parce que ce sont
 * les règles du serveur, pas celles d'un écran. La différence tient à la
 * quantité : la liste ajoute toujours une unité, la fiche ajoute celle que le
 * client a choisie.
 */
export function ProductPurchase({
  product,
  vendor,
}: {
  product: Product;
  /** `null` sur une réponse antérieure au champ — la fiche reste utilisable. */
  vendor: ProductVendorRef | null;
}) {
  const { token } = useAuthStore();
  const addToCart = useAddToCart(token);
  const clearCart = useClearCart(token);
  const { data: cart } = useCart(token);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const state = computePurchaseState(product, vendor);
  const unitPrice = selectedVariant?.prix ?? product.prixOriginal;
  const total = unitPrice * quantity;
  const images = galleryImages(product, product.nom);

  // Le stock peut baisser entre deux visites : une quantité choisie plus tôt
  // n'a pas à rester au-dessus du plafond courant.
  const cappedQuantity = Math.min(quantity, state.maxQuantity);
  if (cappedQuantity !== quantity) setQuantity(cappedQuantity);

  /**
   * `add_to_cart` — après acceptation du serveur, jamais au clic.
   *
   * Les deux chemins d'ajout de cet écran (direct et après résolution d'un
   * conflit de panier) passent par ici : en oublier un rendrait le comptage
   * dépendant de la manière dont le client s'y est pris.
   */
  function trackAdded() {
    analytics.track('add_to_cart', {
      product_id: product.id,
      product_name: product.nom,
      restaurant_id: product.restaurantId,
      price: unitPrice,
      quantity,
    });
  }

  function confirmAdded() {
    trackAdded();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function addNow() {
    if (!selectedVariant) return;
    await addToCart.mutateAsync({
      productId: product.id,
      variantId: selectedVariant.id,
      quantite: quantity,
    });
    confirmAdded();
  }

  async function handleAdd() {
    if (!token) {
      // Le bouton reste actif pour un visiteur non connecté : le griser lui
      // ferait croire que le produit est indisponible. On l'emmène se
      // connecter, et on le ramène ici — la page connaît son propre chemin,
      // ce que la liste du menu ne pouvait pas faire.
      toast.error('Connectez-vous pour ajouter au panier', {
        action: {
          label: 'Se connecter',
          onClick: () => {
            window.location.href = `/connexion?redirect=/produits/${product.id}`;
          },
        },
      });
      return;
    }
    if (!selectedVariant) return;

    if (hasPreorderConflict(cart, product)) {
      setConflictOpen(true);
      return;
    }

    try {
      await addNow();
      toast.success(
        quantity > 1
          ? `${quantity} × ${product.nom} ajoutés au panier`
          : `${product.nom} ajouté au panier`,
      );
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? '';
      if (msg.toLowerCase().includes('restaurant') || msg.toLowerCase().includes('vider')) {
        toast.error('Votre panier contient des plats d’un autre vendeur.', {
          action: {
            label: 'Vider et ajouter',
            onClick: async () => {
              try {
                await clearCart.mutateAsync();
                await addNow();
                toast.success(`${product.nom} ajouté au panier`);
              } catch {
                toast.error('Erreur lors de l’ajout');
              }
            },
          },
        });
      } else {
        // Le backend écrit des messages faits pour être lus (« Ce produit
        // n'est plus disponible ») : les remplacer jetterait la seule
        // information exploitable de la réponse.
        toast.error(msg || 'Impossible d’ajouter au panier');
      }
    }
  }

  async function handleConfirmConflict() {
    setConflictOpen(false);
    try {
      await clearCart.mutateAsync();
      await addNow();
      toast.success(`Panier vidé. ${product.nom} ajouté.`);
    } catch {
      toast.error('Erreur lors du remplacement du panier');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ImageCarousel
        images={images}
        className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-200"
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        fallback={
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-cream-200">
            <ShoppingBag className="h-12 w-12 text-ink-300" aria-hidden />
          </div>
        }
      />

      {/* Variantes — n'apparaissent qu'à partir de deux : proposer un choix
          unique donne l'illusion d'une décision à prendre. */}
      {product.variants.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink-700">Choisissez une option</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariant(v)}
                aria-pressed={selectedVariant?.id === v.id}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm transition-all',
                  selectedVariant?.id === v.id
                    ? 'border-tomato-600 bg-tomato-100 font-semibold text-tomato-700'
                    : 'border-cream-300 bg-white text-ink-700 hover:border-tomato-600',
                )}
              >
                {v.label ?? 'Standard'} — {formatCurrency(v.prix)}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Quantité — masquée quand le produit n'est pas commandable : choisir
          une quantité qu'on ne pourra pas valider est une impasse. */}
      {state.canAdd && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-ink-700">Quantité</span>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            max={state.maxQuantity}
          />
        </div>
      )}

      {state.canAdd && product.stockRestant !== null && product.stockRestant <= 5 && (
        <p className="text-xs text-amber-600">
          Plus que {product.stockRestant} en stock
        </p>
      )}

      {state.message && (
        <p className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-700">
          {state.message}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={!state.canAdd || addToCart.isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all',
          state.canAdd
            ? added
              ? 'bg-success text-white'
              : 'bg-tomato-600 text-white shadow-sm shadow-tomato-100 hover:bg-tomato-700'
            : 'cursor-not-allowed bg-cream-200 text-ink-500',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {addToCart.isPending ? (
            <motion.span key="pending" className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Ajout en cours…
            </motion.span>
          ) : added ? (
            <motion.span
              key="added"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" aria-hidden />
              Ajouté au panier
            </motion.span>
          ) : !state.canAdd ? (
            <motion.span key="blocked" className="flex items-center gap-2">
              <Lock className="h-4 w-4" aria-hidden />
              Indisponible
            </motion.span>
          ) : (
            <motion.span key="add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter au panier · {formatCurrency(total)}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {state.canAdd && (
        <Link
          href="/panier"
          className="text-center text-xs font-medium text-tomato-700 hover:text-ink-900"
        >
          Voir mon panier
        </Link>
      )}

      <CartModeConflictDialog
        open={conflictOpen}
        cartIsPreorder={isPreorderCart(cart)}
        incomingProductName={product.nom}
        onConfirm={handleConfirmConflict}
        onCancel={() => setConflictOpen(false)}
      />
    </div>
  );
}
