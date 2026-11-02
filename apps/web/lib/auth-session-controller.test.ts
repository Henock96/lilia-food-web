import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { User } from '@lilia/types';
import { AuthSessionController, type Identity, type SessionPorts } from './auth-session-controller';
import { discardLegacyAuth, useAuthStore } from '../store/auth';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const profile = (uid: string) => ({ id: `backend-${uid}`, firebaseUid: uid, nom: uid } as User);
function identity(uid: string): Identity {
  return { uid, email: `${uid}@example.test`, displayName: uid, photoURL: null,
    getIdToken: vi.fn(async () => `token-${uid}`) };
}
function harness() {
  let current: Identity | null = null;
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ports: SessionPorts = {
    currentUser: () => current,
    syncProfile: vi.fn(async (user) => profile(user.uid)),
    cookie: vi.fn(async (intent) => intent.isCurrent() ? 'applied' : 'obsolete'),
    signOut: vi.fn(async () => { current = null; }),
    publish: vi.fn(),
    resetPrivateState: vi.fn(() => cache.clear()),
  };
  const controller = new AuthSessionController(ports);
  return { controller, ports, cache, setCurrent: (user: Identity | null) => { current = user; },
    async login(user: Identity) { current = user; await controller.acceptUser(user); } };
}

describe('AuthSessionController — isolation réelle des générations', () => {
  it('publie la fin de déconnexion Firebase pour réactiver les observateurs anonymes', async () => {
    const h = harness(); await h.login(identity('A'));
    const signedOut = deferred<void>();
    vi.mocked(h.ports.signOut).mockImplementationOnce(async () => {
      await signedOut.promise; h.setCurrent(null);
    });
    const logout = h.controller.logout();
    expect(h.controller.getSnapshot().phase).toBe('loading');
    expect(h.controller.getSnapshot().user).toBeNull();
    signedOut.resolve(); await logout;
    expect(h.controller.getSnapshot().phase).toBe('anonymous');
    expect(h.controller.isCurrent(h.controller.getSnapshot())).toBe(true);
  });
  it('préserve le formulaire pendant son login et le réinitialise après une fermeture terminale', async () => {
    const h = harness();
    const initial = h.controller.getSnapshot().formResetKey;
    const ticket = await h.controller.beginAuthentication();
    expect(h.controller.getSnapshot().formResetKey).toBe(initial);
    const a = identity('A'); h.setCurrent(a);
    await h.controller.completeAuthentication(ticket, a, { telephone: 'synthetic-phone', referralCode: 'SYNTHETIC' });
    expect(h.controller.getSnapshot().formResetKey).toBe(initial);
    expect(h.ports.syncProfile).toHaveBeenCalledTimes(1);
    expect(h.ports.syncProfile).toHaveBeenCalledWith(a, 'token-A', expect.any(AbortSignal), { telephone: 'synthetic-phone', referralCode: 'SYNTHETIC' });
    await h.controller.logout();
    expect(h.controller.getSnapshot().formResetKey).toBeGreaterThan(initial);
  });

  it('un login Firebase refusé permet immédiatement une nouvelle tentative', async () => {
    const h = harness();
    const first = await h.controller.beginAuthentication();
    await h.controller.cancelAuthentication(first);
    expect(h.controller.getSnapshot().phase).toBe('anonymous');
    expect(h.controller.authenticationCurrent(first)).toBe(true);
    const second = await h.controller.beginAuthentication();
    expect(second).toBeGreaterThan(first);
    expect(h.controller.authenticationCurrent(first)).toBe(false);
  });
  it('S01 ferme le credential A et retire son cache avant la synchronisation B', async () => {
    const h = harness(); await h.login(identity('A'));
    const old = h.controller.getCredential()!;
    h.cache.setQueryData(['private', 'A', 'addresses'], ['adresse-A']);
    const sync = deferred<User>();
    vi.mocked(h.ports.syncProfile).mockReturnValueOnce(sync.promise);
    const b = identity('B'); h.setCurrent(b);
    const loginB = h.controller.acceptUser(b);
    expect(h.cache.getQueryCache().getAll()).toHaveLength(0);
    expect(old.signal.aborted).toBe(true);
    expect(old.isCurrent()).toBe(false);
    expect(() => old.getToken()).toThrow();
    expect(h.controller.getSnapshot().user).toBeNull();
    expect(h.controller.getCredential()).toBeNull();
    sync.resolve(profile('B')); await loginB;
    expect(h.controller.getSnapshot().user?.firebaseUid).toBe('B');
  });

  it('S03 une syncProfile A tardive ne publie ni profil ni cookie après B', async () => {
    const h = harness(); const sync = deferred<User>();
    vi.mocked(h.ports.syncProfile).mockReturnValueOnce(sync.promise);
    const a = identity('A'); h.setCurrent(a);
    const old = h.controller.acceptUser(a);
    await vi.waitFor(() => expect(h.ports.syncProfile).toHaveBeenCalledTimes(1));
    await h.login(identity('B'));
    sync.resolve(profile('A')); await old;
    expect(h.controller.getSnapshot().user?.firebaseUid).toBe('B');
    expect(vi.mocked(h.ports.cookie).mock.calls.map(([intent]) => intent.token)).toEqual(['token-B']);
  });

  it('S04 un getIdToken A tardif ne lance pas de sync avec A après B', async () => {
    const h = harness(); const token = deferred<string>(); const a = identity('A');
    vi.mocked(a.getIdToken).mockReturnValueOnce(token.promise);
    h.setCurrent(a); const old = h.controller.acceptUser(a);
    await h.login(identity('B'));
    token.resolve('late-A'); await old;
    expect(h.ports.syncProfile).toHaveBeenCalledTimes(1);
    expect(h.controller.getCredential()!.getToken()).toBe('token-B');
  });

  it('S05 écarte le stockage legacy sans hydrater un profil non vérifié', () => {
    const removeItem = vi.fn(); discardLegacyAuth({ removeItem });
    expect(removeItem).toHaveBeenCalledWith('lilia-auth');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState()).not.toHaveProperty('token');
    expect(useAuthStore).not.toHaveProperty('persist');
    expect(() => discardLegacyAuth({ removeItem: () => { throw new Error('denied'); } })).not.toThrow();
  });

  it('S06 mutualise le refresh et conserve génération, profil et cache', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    const credential = h.controller.getCredential()!;
    const generation = h.controller.getSnapshot().generation;
    h.cache.setQueryData(['private', 'A'], ['retained']);
    const token = deferred<string>(); vi.mocked(a.getIdToken).mockReturnValueOnce(token.promise);
    const first = credential.refresh(); const second = credential.refresh();
    expect(first).toBe(second); expect(a.getIdToken).toHaveBeenCalledTimes(2);
    expect(a.getIdToken).toHaveBeenLastCalledWith(true);
    token.resolve('fresh-A'); await Promise.all([first, second]);
    expect(credential.getToken()).toBe('fresh-A');
    expect(h.controller.getSnapshot().generation).toBe(generation);
    expect(h.cache.getQueryData(['private', 'A'])).toEqual(['retained']);
    expect(h.ports.resetPrivateState).toHaveBeenCalledTimes(1);
  });

  it.each(['ACCOUNT_REVOKED', 'ACCOUNT_NOT_SYNCED'])('S07/08 retire la session après %s définitif', async (code) => {
    const h = harness(); await h.login(identity('A')); const credential = h.controller.getCredential()!;
    if (code === 'ACCOUNT_NOT_SYNCED') await credential.onAuthError({ status: 403, code });
    await credential.onAuthError({ status: 403, code });
    expect(h.controller.getCredential()).toBeNull();
    expect(h.controller.getSnapshot().user).toBeNull();
    expect(h.ports.signOut).toHaveBeenCalledTimes(1);
    expect(credential.signal.aborted).toBe(true);
  });

  it('S09 le profil et une erreur auth tardifs A ne touchent pas B', async () => {
    const h = harness(); await h.login(identity('A'));
    const context = h.controller.getSnapshot(); const old = h.controller.getCredential()!;
    await h.login(identity('B'));
    h.controller.updateProfile(profile('A'), context);
    await expect(old.onAuthError({ status: 401 })).rejects.toThrow();
    expect(h.controller.getSnapshot().user?.firebaseUid).toBe('B');
    expect(h.ports.signOut).not.toHaveBeenCalled();
  });

  it('S10 reconnexion du même UID crée une génération distincte', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    const old = h.controller.getCredential()!;
    expect(await h.controller.logout()).toBe(true);
    await h.login(a);
    expect(h.controller.getCredential()!.generation).toBeGreaterThan(old.generation);
    expect(old.isCurrent()).toBe(false);
  });

  it('un callback token normal du même UID conserve le cache et le profil', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    h.cache.setQueryData(['private', 'A'], 'retained');
    const credential = h.controller.getCredential();
    await h.controller.acceptUser(a);
    expect(h.controller.getCredential()).toBe(credential);
    expect(h.cache.getQueryData(['private', 'A'])).toBe('retained');
    expect(h.ports.syncProfile).toHaveBeenCalledTimes(1);
  });

  it('une panne bootstrap ne publie pas de credential et reste réessayable', async () => {
    const h = harness(); vi.mocked(h.ports.syncProfile).mockRejectedValueOnce(new Error('network'));
    const a = identity('A'); await h.login(a);
    expect(h.controller.getSnapshot().phase).toBe('error');
    expect(h.controller.getSnapshot().user).toBeNull();
    expect(h.controller.getCredential()).toBeNull();
    await h.controller.acceptUser(a);
    expect(h.controller.getSnapshot().phase).toBe('ready');
  });

  it('une panne refresh ne conserve pas un ancien token utilisable', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    const credential = h.controller.getCredential()!;
    vi.mocked(a.getIdToken).mockRejectedValueOnce(new Error('revoked'));
    await expect(credential.refresh()).rejects.toThrow('revoked');
    expect(h.controller.getCredential()).toBeNull();
    expect(credential.isCurrent()).toBe(false);
  });
  it.each(['auth/user-disabled', 'auth/user-not-found'])('bootstrap %s ferme la session Firebase', async (code) => {
    const h = harness(); const a = identity('A');
    vi.mocked(a.getIdToken).mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    await h.login(a);
    expect(h.controller.getCredential()).toBeNull();
    expect(h.controller.getSnapshot().user).toBeNull();
    expect(h.ports.signOut).toHaveBeenCalledTimes(1);
  });

  it('une fermeture cookie retardée de A ne navigue pas après connexion B', async () => {
    const h = harness(); await h.login(identity('A'));
    const closing = deferred<'applied' | 'obsolete'>();
    vi.mocked(h.ports.cookie).mockReturnValueOnce(closing.promise);
    const logout = h.controller.logout();
    await vi.waitFor(() => expect(h.ports.cookie).toHaveBeenCalledTimes(2));
    const closeIntent = vi.mocked(h.ports.cookie).mock.calls[1]![0];
    await h.login(identity('B'));
    expect(closeIntent.isCurrent()).toBe(false);
    closing.resolve('obsolete');
    expect(await logout).toBe(false);
    expect(h.controller.getSnapshot().user?.firebaseUid).toBe('B');
  });

  it('attend la déconnexion Firebase avant de commencer une autre authentification', async () => {
    const h = harness(); await h.login(identity('A'));
    const signedOut = deferred<void>();
    vi.mocked(h.ports.signOut).mockImplementationOnce(async () => {
      await signedOut.promise; h.setCurrent(null); await h.controller.acceptUser(null);
    });
    const logout = h.controller.logout();
    let ticketReady = false;
    const authentication = Promise.resolve(h.controller.beginAuthentication()).then((ticket) => {
      ticketReady = true; return ticket;
    });
    await Promise.resolve();
    expect(ticketReady).toBe(false);
    signedOut.resolve(); await logout;
    const ticket = await authentication;
    const b = identity('B'); h.setCurrent(b);
    await h.controller.completeAuthentication(ticket, b);
    expect(h.controller.getSnapshot().user?.firebaseUid).toBe('B');
  });

  it('un token normal ancien ne remplace pas le refresh forcé plus récent', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    const credential = h.controller.getCredential()!;
    const normal = deferred<string>();
    vi.mocked(a.getIdToken).mockReturnValueOnce(normal.promise).mockResolvedValueOnce('forced-new');
    const callback = h.controller.acceptUser(a);
    await credential.refresh();
    normal.resolve('normal-old'); await callback;
    expect(credential.getToken()).toBe('forced-new');
    const written = vi.mocked(h.ports.cookie).mock.calls.map(([intent]) => intent.token);
    expect(written.at(-1)).toBe('forced-new');
  });

  it('deux ACCOUNT_NOT_SYNCED simultanés partagent une seule resynchronisation', async () => {
    const h = harness(); await h.login(identity('A'));
    const credential = h.controller.getCredential()!;
    const synced = deferred<User>();
    vi.mocked(h.ports.syncProfile).mockReturnValueOnce(synced.promise);
    const first = credential.onAuthError({ status: 403, code: 'ACCOUNT_NOT_SYNCED' });
    const second = credential.onAuthError({ status: 403, code: 'ACCOUNT_NOT_SYNCED' });
    synced.resolve(profile('A')); await Promise.all([first, second]);
    expect(h.ports.signOut).not.toHaveBeenCalled();
    expect(h.ports.syncProfile).toHaveBeenCalledTimes(2);
    expect(h.controller.getSnapshot().phase).toBe('ready');
  });

  it('annuler une connexion anonyme échouée conserve le ticket pour afficher une erreur et réessayer', async () => {
    const h = harness(); const ticket = await h.controller.beginAuthentication();
    await h.controller.cancelAuthentication(ticket);
    expect(h.controller.getSnapshot().phase).toBe('anonymous');
    expect(h.controller.getCredential()).toBeNull();
    expect(h.controller.authenticationCurrent(ticket)).toBe(true);
    expect(await h.controller.beginAuthentication()).toBeGreaterThan(ticket);
  });

  it('inscription : un callback Firebase réentrant ne devance pas les détails du formulaire', async () => {
    const h = harness(); const ticket = await h.controller.beginAuthentication();
    const a = identity('A'); h.setCurrent(a);
    await h.controller.acceptUser(a);
    expect(h.ports.syncProfile).not.toHaveBeenCalled();
    const details = { phone: '+242061234567', referralCode: 'SYNTHETIC' };
    await h.controller.completeAuthentication(ticket, a, details);
    expect(h.ports.syncProfile).toHaveBeenCalledTimes(1);
    expect(h.ports.syncProfile).toHaveBeenCalledWith(a, 'token-A', expect.any(AbortSignal), details);
    expect(h.controller.getSnapshot().phase).toBe('ready');
  });

  it('un callback Firebase pendant refresh rejoint le refresh sans relire un token', async () => {
    const h = harness(); const a = identity('A'); await h.login(a);
    const token = deferred<string>(); vi.mocked(a.getIdToken).mockReturnValueOnce(token.promise);
    const refresh = h.controller.getCredential()!.refresh();
    const callback = h.controller.acceptUser(a);
    token.resolve('fresh'); await Promise.all([refresh, callback]);
    expect(a.getIdToken).toHaveBeenCalledTimes(2);
    expect(h.controller.getCredential()!.getToken()).toBe('fresh');
  });

});
