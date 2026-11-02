import { afterEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile, useMyOrders, useAdresses, profileKeys, orderKeys, adresseKeys } from '@lilia/api-client';
import type { User } from '@lilia/types';
import { AuthSessionController, type Identity } from './auth-session-controller';
import { getQueryClient, retireQueryClient } from './query-client';
import { useAuthStore } from '../store/auth';
import { Providers } from '../components/providers';

const active = vi.hoisted(() => ({ controller: null as AuthSessionController | null }));
vi.mock('../components/auth-provider', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/lib/auth-session', () => ({ getBrowserSession: () => active.controller }));
vi.mock('next/navigation', () => ({ usePathname: () => '/profil' }));

afterEach(() => { retireQueryClient(); vi.unstubAllGlobals(); active.controller = null; });

describe('Providers + vrais hooks privés — rendu Node sans Firebase/réseau', () => {
  it('ne rend pas le cache A après transition contrôleur vers B et retire le QueryClient', async () => {
    // window selects the browser cache branch only; this is not a DOM/lifecycle test.
    vi.stubGlobal('window', {});
    vi.stubGlobal('React', React);
    let current: Identity | null = null;
    const controller = new AuthSessionController({
      currentUser: () => current,
      syncProfile: async (user) => ({ id: user.uid, firebaseUid: user.uid, nom: user.uid } as User),
      cookie: async (intent) => intent.isCurrent() ? 'applied' : 'obsolete',
      signOut: async () => { current = null; },
      publish: (state) => useAuthStore.setState(state),
      resetPrivateState: retireQueryClient,
    });
    active.controller = controller;
    const user = (uid: string): Identity => ({ uid, email: null, displayName: uid, photoURL: null,
      getIdToken: async () => `synthetic-${uid}` });
    current = user('A'); await controller.acceptUser(current);
    const clientA = getQueryClient();
    clientA.setQueryData(profileKeys.me, { nom: 'PRIVATE-PROFILE-A' });
    clientA.setQueryData(orderKeys.mine(), [{ id: 'PRIVATE-ORDER-A' }]);
    clientA.setQueryData(adresseKeys.list(), [{ rue: 'PRIVATE-ADDRESS-A' }]);
    let renderedClient: ReturnType<typeof getQueryClient> | undefined;
    function PrivateProbe() {
      renderedClient = useQueryClient();
      const token = controller.getCredential();
      const profile = useProfile(token);
      const orders = useMyOrders(token);
      const addresses = useAdresses(token);
      return createElement('output', null, JSON.stringify({
        profile: profile.data, orders: orders.data, addresses: addresses.data,
      }));
    }
    const render = () => renderToStaticMarkup(createElement(Providers, null, createElement(PrivateProbe)));
    const before = render();
    expect(renderedClient).toBe(clientA);
    for (const kind of ['PROFILE', 'ORDER', 'ADDRESS']) expect(before).toContain(`PRIVATE-${kind}-A`);
    current = user('B'); await controller.acceptUser(current);
    const after = render();
    expect(renderedClient).not.toBe(clientA);
    expect(clientA.getQueryCache().getAll()).toHaveLength(0);
    expect(after).not.toContain('PRIVATE-');
    expect(controller.getSnapshot().user?.firebaseUid).toBe('B');
  });

  it('SSR sans window crée un QueryClient distinct pour chaque requête', () => {
    const first = getQueryClient(); const second = getQueryClient();
    first.setQueryData(['private'], 'A');
    expect(first).not.toBe(second);
    expect(second.getQueryData(['private'])).toBeUndefined();
    first.clear(); second.clear();
  });
});
