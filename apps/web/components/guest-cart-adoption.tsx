'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, cartKeys, cartQueryOptions, type AuthCredential } from '@lilia/api-client';
import type { Cart } from '@lilia/types';
import { getBrowserSession } from '@/lib/auth-session';
import { GUEST_CART_KEY, readGuestCart } from '@/lib/guest-cart';
import { adoptGuestCart } from '@/lib/guest-cart-adoption';
import { useAuthStore } from '@/store/auth';
import { useGuestCartStore } from '@/store/guest-cart';

/**
 * Deux onglets ouverts à la connexion verseraient le même panier : le serveur
 * additionnant, les quantités doubleraient. Le verrou sérialise, et le stockage
 * est relu **dedans** : le second onglet le trouve vide.
 */
function exclusively<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(GUEST_CART_KEY, work) as Promise<T>;
  }
  return work();
}

function adopt(token: AuthCredential) {
  const { setLines } = useGuestCartStore.getState();
  return exclusively(() =>
    adoptGuestCart({
      lines: readGuestCart(),
      readServerCart: () => cartQueryOptions(token).queryFn(),
      clearServerCart: () => apiClient<void>('/cart/clear', { method: 'DELETE', token }),
      addLine: (line) =>
        apiClient<Cart>('/cart/add', {
          method: 'POST',
          token,
          body: JSON.stringify({
            productId: line.productId,
            variantId: line.variantId,
            quantite: line.quantite,
            ...(line.options.length > 0 && { options: line.options }),
          }),
        }),
      save: setLines,
    }),
  );
}

/** Relit le panier local et le verse dans le panier serveur dès que la session est prête. */
export function GuestCartAdoption() {
  const phase = useAuthStore((s) => s.phase);
  const lineCount = useGuestCartStore((s) => s.lines.length);
  const adoption = useGuestCartStore((s) => s.adoption);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { hydrate } = useGuestCartStore.getState();
    hydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_CART_KEY) hydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || lineCount === 0 || adoption !== 'idle') return;
    const token = getBrowserSession().getCredential();
    if (!token) return;

    const { setAdoption, hydrate } = useGuestCartStore.getState();
    setAdoption('running');
    void adopt(token).then((result) => {
      hydrate();
      setAdoption(result.status === 'done' ? 'idle' : 'failed');
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
      if (result.replaced) toast.info('Votre ancien panier a été remplacé par celui que vous venez de composer.');
      if (result.refused.length > 0) toast.error(`Plus disponible : ${result.refused.join(', ')}`);
      if (result.status === 'interrupted') toast.error('Votre panier n’a pas pu être repris.');
    });
  }, [phase, lineCount, adoption, queryClient]);

  return null;
}
