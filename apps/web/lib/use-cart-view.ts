'use client';

import { useMemo } from 'react';
import { useCart, type AuthCredential } from '@lilia/api-client';
import type { Cart } from '@lilia/types';
import { guestCartAsCart } from '@/lib/guest-cart';
import { useGuestCartStore } from '@/store/guest-cart';

/** Le panier à afficher : celui du serveur pour un client, le local pour un visiteur. */
export function useCartView(token: AuthCredential | null): Cart | undefined {
  const { data: serverCart } = useCart(token);
  const lines = useGuestCartStore((s) => s.lines);
  const guestCart = useMemo(() => guestCartAsCart(lines), [lines]);
  return token ? serverCart : guestCart;
}
