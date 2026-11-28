'use client';

import { useRef } from 'react';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@lilia/api-client';
import { toast } from 'sonner';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import {
  collectionReadState,
  runVisibleMutation,
  mutationErrorMessage,
} from '@/lib/account-feedback';
import { canIncreaseGuestLine } from '@/lib/guest-cart';
import { useCartView } from '@/lib/use-cart-view';
import { useGuestCartStore } from '@/store/guest-cart';

export function useEditableCart() {
  const { token, isLoading: sessionLoading } = useAuthSession();
  const isCurrentSession = useSessionGuard();
  const { data: serverCart, isLoading, isError, isFetching, isPaused, refetch } = useCart(token);
  const cart = useCartView(token);
  const guestLines = useGuestCartStore((s) => s.lines);
  const updateItem = useUpdateCartItem(token);
  const removeItem = useRemoveCartItem(token);
  const gate = useRef(false);
  const busy =
    updateItem.isPending ||
    removeItem.isPending ||
    updateItem.isPaused ||
    removeItem.isPaused ||
    isFetching ||
    isPaused;
  // Le visiteur a son panier local : rien à charger, rien qui puisse échouer.
  const guest = !sessionLoading && !token;
  const readState = sessionLoading
    ? 'loading'
    : guest
      ? 'ready'
      : collectionReadState(serverCart, isLoading, isError || isPaused);
  function changeQuantity(itemId: string, quantite: number) {
    if (guest) {
      useGuestCartStore.getState().setQuantity(itemId, quantite);
      return;
    }
    if (busy) return;
    void runVisibleMutation({
      gate,
      isCurrent: isCurrentSession,
      run: () =>
        quantite === 0
          ? removeItem.mutateAsync(itemId)
          : updateItem.mutateAsync({ itemId, quantite }),
      onError: (error) =>
        toast.error(
          mutationErrorMessage(
            error,
            'Impossible de modifier le panier. Réessayez après vérification de votre connexion.',
          ),
        ),
    });
  }

  return {
    cart,
    readState,
    guest,
    busy,
    refetch,
    isFetching,
    changeQuantity,
    canIncrease: (itemId: string) => (guest ? canIncreaseGuestLine(guestLines, itemId) : !busy),
  };
}
