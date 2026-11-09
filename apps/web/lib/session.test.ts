import { describe, expect, it, vi } from 'vitest';
import { createSessionCookieCoordinator, type SessionCookieResult } from './session';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const ok = () => new Response(null, { status: 200 });

describe('session cookie coordinator', () => {
  it('visiteur anonyme sans témoin : aucune requête pour un cookie absent (PERF-07)', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send, hasSessionCookie: () => false });
    expect(await cookies.reconcile({ token: null, isCurrent: () => true })).toBe('applied');
    expect(send).not.toHaveBeenCalled();
  });

  it('déconnexion avec témoin présent : le DELETE part', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send, hasSessionCookie: () => true });
    expect(await cookies.reconcile({ token: null, isCurrent: () => true })).toBe('applied');
    expect(send.mock.calls.map(([, init]) => init?.method)).toEqual(['DELETE']);
  });

  it('connexion : le POST part même sans témoin', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send, hasSessionCookie: () => false });
    expect(await cookies.reconcile({ token: 'synthetic-A', isCurrent: () => true })).toBe('applied');
    expect(send.mock.calls.map(([, init]) => init?.method)).toEqual(['POST']);
  });

  it('attend le POST A envoyé avant le DELETE de déconnexion', async () => {
    const started = deferred<void>();
    const response = deferred<Response>();
    let generation = 1;
    const send = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => { started.resolve(); return response.promise; })
      .mockResolvedValue(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send });
    const a = cookies.reconcile({ token: 'synthetic-A', isCurrent: () => generation === 1 });
    await started.promise;
    generation = 2;
    const logout = cookies.reconcile({ token: null, isCurrent: () => generation === 2 });
    expect(send).toHaveBeenCalledTimes(1);
    response.resolve(ok());
    expect(await a).toBe('obsolete');
    expect(await logout).toBe('applied');
    expect(send.mock.calls.map(([, init]) => init?.method)).toEqual(['POST', 'DELETE']);
  });

  it('A retardé puis logout puis B : ignore le DELETE dépassé et termine sur B', async () => {
    const started = deferred<void>();
    const response = deferred<Response>();
    let generation = 1;
    const send = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => { started.resolve(); return response.promise; })
      .mockResolvedValue(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send });
    const a = cookies.reconcile({ token: 'synthetic-A', isCurrent: () => generation === 1 });
    await started.promise;
    generation = 2;
    const logout = cookies.reconcile({ token: null, isCurrent: () => generation === 2 });
    generation = 3;
    const b = cookies.reconcile({ token: 'synthetic-B', isCurrent: () => generation === 3 });
    response.resolve(ok());
    expect(await Promise.all([a, logout, b])).toEqual(['obsolete', 'obsolete', 'applied']);
    // Le DELETE dépassé n'est pas parti ; la dernière écriture pose le témoin.
    expect(send.mock.calls.map(([, init]) => init?.method)).toEqual(['POST', 'POST']);
    // Aucun jeton ne quitte le navigateur (SEC-07).
    expect(send.mock.calls.every(([, init]) => init?.body === undefined)).toBe(true);
  });

  it.each(['http', 'network'] as const)('signale un échec %s et laisse la file reprendre', async (failure) => {
    const send = vi.fn<typeof fetch>();
    if (failure === 'http') send.mockResolvedValueOnce(new Response(null, { status: 500 }));
    else send.mockRejectedValueOnce(new Error('offline'));
    send.mockResolvedValueOnce(ok());
    const cookies = createSessionCookieCoordinator({ fetch: send });
    const a = cookies.reconcile({ token: 'synthetic-A', isCurrent: () => true });
    const logout = cookies.reconcile({ token: null, isCurrent: () => true });
    await expect(a).rejects.toThrow();
    expect(await logout).toBe('applied');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('revérifie identité et génération après attente du verrou', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    let current = true;
    const send = vi.fn<typeof fetch>();
    const cookies = createSessionCookieCoordinator({
      fetch: send,
      withLock: async (work) => { entered.resolve(); await release.promise; return work(); },
    });
    const pending = cookies.reconcile({ token: 'synthetic-A', isCurrent: () => current });
    await entered.promise;
    current = false;
    release.resolve();
    expect(await pending).toBe('obsolete');
    expect(send).not.toHaveBeenCalled();
  });

  it('deux coordinateurs partagent le verrou : aucun DELETE avant fin du POST', async () => {
    let tail: Promise<unknown> = Promise.resolve();
    const withLock = (work: () => Promise<SessionCookieResult>) => {
      const next = tail.then(work);
      tail = next.catch(() => undefined);
      return next;
    };
    const started = deferred<void>();
    const response = deferred<Response>();
    let currentA = true;
    const send = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => { started.resolve(); return response.promise; })
      .mockResolvedValue(ok());
    const tabA = createSessionCookieCoordinator({ fetch: send, withLock });
    const tabB = createSessionCookieCoordinator({ fetch: send, withLock });
    const a = tabA.reconcile({ token: 'synthetic-A', isCurrent: () => currentA });
    await started.promise;
    currentA = false;
    const logout = tabB.reconcile({ token: null, isCurrent: () => true });
    expect(send).toHaveBeenCalledTimes(1);
    response.resolve(ok());
    expect(await Promise.all([a, logout])).toEqual(['obsolete', 'applied']);
    expect(send.mock.calls.map(([, init]) => init?.method)).toEqual(['POST', 'DELETE']);
  });
});
