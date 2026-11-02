import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProfile, profileKeys, useMyOrders, orderKeys, useAdresses, adresseKeys,
  cartKeys, favoriteKeys, claimKeys, reviewKeys, paymentKeys, photoKeys } from '@lilia/api-client';
import type { User } from '@lilia/types';
import { AuthSessionController, INITIAL_SESSION, type Identity, type SessionState } from './auth-session-controller';
import { getQueryClient, retireQueryClient } from './query-client';

const bridge = vi.hoisted(() => ({ state: {} as SessionState, controller: null as AuthSessionController | null }));
vi.mock('@/store/auth', () => ({ useAuthStore: () => bridge.state }));
vi.mock('@/lib/auth-session', () => ({ getBrowserSession: () => bridge.controller }));
vi.mock('../components/auth-provider', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('next/navigation', () => ({ usePathname: () => '/profil' }));
import { Providers } from '../components/providers';

function PrivateScreen() {
  const credential = bridge.controller!.getCredential();
  const profile = useProfile(credential);
  const orders = useMyOrders(credential);
  const addresses = useAdresses(credential);
  return createElement('output', null, JSON.stringify([profile.data, orders.data, addresses.data]));
}

afterEach(() => { retireQueryClient(); vi.unstubAllGlobals(); });

describe('Providers et hooks réels, rendu React sans navigateur', () => {
  it('S01/S02 isole les mêmes clés fraîches et un ancien cache réécrit après A → B', async () => {
    vi.stubGlobal('window', {});
    let current: Identity | null = null;
    bridge.state = { ...INITIAL_SESSION };
    const controller = new AuthSessionController({
      currentUser: () => current,
      syncProfile: async (user) => ({ id: user.uid, firebaseUid: user.uid, nom: user.uid } as User),
      cookie: async (intent) => intent.isCurrent() ? 'applied' : 'obsolete',
      signOut: async () => { current = null; },
      publish: (state) => { bridge.state = state; },
      resetPrivateState: retireQueryClient,
    });
    bridge.controller = controller;
    const login = async (uid: string) => {
      current = { uid, email: null, displayName: uid, photoURL: null, getIdToken: async () => `token-${uid}` };
      await controller.acceptUser(current);
    };
    const render = () => renderToString(createElement(Providers, null, createElement(PrivateScreen)));
    await login('A');
    const old = getQueryClient();
    old.setQueryData(profileKeys.me, { nom: 'private-A' });
    old.setQueryData(orderKeys.mine(), [{ id: 'order-A' }]);
    old.setQueryData(adresseKeys.list(), [{ id: 'address-A' }]);
    const otherPrivateKeys = [cartKeys.detail(), favoriteKeys.all, profileKeys.loyalty,
      profileKeys.referral, claimKeys.list('mine', 1, 'open'), claimKeys.detail('claim'),
      reviewKeys.myReview('restaurant'), reviewKeys.canReview('restaurant'),
      paymentKeys.forOrder('order'), photoKeys.list('vendor', 'restaurant', 'manage')];
    for (const key of otherPrivateKeys) old.setQueryData(key, 'private-A');
    expect(render()).toContain('private-A');
    await controller.logout();
    await login('B');
    const active = getQueryClient();
    expect(active).not.toBe(old);
    expect(old.getQueryCache().getAll()).toHaveLength(0);
    for (const key of otherPrivateKeys) expect(active.getQueryData(key)).toBeUndefined();
    expect(render()).not.toMatch(/private-A|order-A|address-A/);
    active.setQueryData(profileKeys.me, { nom: 'private-B' });
    old.setQueryData(profileKeys.me, { nom: 'late-A' });
    expect(render()).toContain('private-B');
    expect(render()).not.toContain('late-A');
  });

  it('ne partage aucun QueryClient entre deux rendus serveur', () => {
    const first = getQueryClient();
    first.setQueryData(profileKeys.me, { nom: 'private-A' });
    const second = getQueryClient();
    expect(second).not.toBe(first);
    expect(second.getQueryData(profileKeys.me)).toBeUndefined();
  });
});
