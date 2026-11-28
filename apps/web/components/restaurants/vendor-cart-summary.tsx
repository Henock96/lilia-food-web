'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { cartLineTotal, cartSubtotal, formatCurrency } from '@lilia/utils';
import { useEditableCart } from '@/lib/use-editable-cart';
import { CartLineDetails } from '@/components/cart/cart-line-details';

export function VendorCartSummary() {
  const { cart, readState, guest, busy, refetch, isFetching, changeQuantity, canIncrease } =
    useEditableCart();
  const items = cart?.items ?? [];

  return (
    <section
      aria-labelledby="vendor-cart"
      className="border-ink-100 rounded-2xl border bg-white p-5"
    >
      <h2
        id="vendor-cart"
        className="font-display text-ink-900 flex items-center gap-2 text-xl font-extrabold"
      >
        <ShoppingBag className="text-tomato-700 size-5" aria-hidden />
        Votre panier
      </h2>
      {readState === 'loading' ? (
        <p role="status" className="text-ink-500 mt-3 text-sm">
          Chargement du panier…
        </p>
      ) : readState === 'error' ? (
        <div className="text-ink-700 mt-3 text-sm">
          <p>Impossible de charger le panier.</p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="text-tomato-700 min-h-11 font-semibold hover:underline"
          >
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-ink-500 mt-3 text-sm">
          Ajoutez un produit pour commencer votre commande.
        </p>
      ) : (
        <>
          <ul className="divide-ink-100 mt-2 max-h-56 divide-y overflow-y-auto">
            {items.map((item, index) => {
              const name = item.product?.nom ?? item.menu?.nom ?? 'Article';
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-ink-900 text-sm font-semibold">{name}</p>
                    <CartLineDetails item={item} />
                    <p className="text-tomato-700 text-sm">
                      {formatCurrency(cartLineTotal(item, index, items))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, item.quantite - 1)}
                      disabled={!guest && busy}
                      aria-label={
                        item.quantite === 1 ? `Retirer ${name}` : `Diminuer la quantité de ${name}`
                      }
                      className="text-ink-700 hover:bg-cream-100 grid size-11 place-items-center rounded-full disabled:opacity-50"
                    >
                      {item.quantite === 1 ? (
                        <Trash2 className="size-4" aria-hidden />
                      ) : (
                        <Minus className="size-4" aria-hidden />
                      )}
                    </button>
                    <span className="tabular-nums">{item.quantite}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, item.quantite + 1)}
                      disabled={!canIncrease(item.id)}
                      aria-label={`Augmenter la quantité de ${name}`}
                      className="text-tomato-700 hover:bg-tomato-50 grid size-11 place-items-center rounded-full disabled:opacity-50"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-ink-100 text-ink-900 mt-3 flex justify-between gap-2 border-t pt-3 text-sm font-bold">
            <span>{guest ? 'Sous-total indicatif' : 'Sous-total'}</span>
            <span>{formatCurrency(cartSubtotal(cart))}</span>
          </div>
          <Link
            href={guest ? '/connexion?redirect=/panier' : '/panier'}
            className="bg-tomato-600 hover:bg-tomato-700 mt-4 flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold text-white"
          >
            {guest ? 'Se connecter pour commander' : 'Commander'}
          </Link>
          <p className="text-ink-500 mt-2 text-center text-xs">
            Paiement par MTN MoMo ou Airtel Money
          </p>
        </>
      )}
    </section>
  );
}
