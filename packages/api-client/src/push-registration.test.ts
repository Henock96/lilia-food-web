import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enablePush,
  pushState,
  releasePush,
  syncPush,
  type PushDevice,
  type PushPermission,
  type RememberedPushToken,
} from './push-registration';

function device(overrides: Partial<PushDevice> & { perm?: PushPermission; token?: string } = {}) {
  let perm: PushPermission = overrides.perm ?? 'granted';
  let memory: RememberedPushToken | null = null;
  const d: PushDevice = {
    supported: vi.fn(async () => true),
    permission: () => perm,
    requestPermission: vi.fn(async () => { perm = 'granted'; return perm; }),
    getToken: vi.fn(async () => overrides.token ?? 'fcm-1'),
    deleteToken: vi.fn(async () => {}),
    remembered: () => memory,
    remember: vi.fn((value: RememberedPushToken | null) => { memory = value; }),
    ...overrides,
  };
  return d;
}

const session = { uid: 'uid-A', credential: 'id-token-A' };
const registered = () => new Response(JSON.stringify({ data: { status: 'success' } }), { status: 200 });

let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetch = vi.fn(async () => registered());
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => vi.unstubAllGlobals());

function calls() {
  return fetch.mock.calls.map(([url, init]: [string, RequestInit]) => ({
    path: new URL(url).pathname,
    method: init.method,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
    auth: (init.headers as Record<string, string>).Authorization,
  }));
}

describe('pushState', () => {
  it('reports unsupported before reading the permission', async () => {
    const d = device({ supported: vi.fn(async () => false) });
    await expect(pushState(d)).resolves.toBe('unsupported');
  });
  it('reflects the browser permission', async () => {
    await expect(pushState(device({ perm: 'denied' }))).resolves.toBe('denied');
    await expect(pushState(device({ perm: 'default' }))).resolves.toBe('default');
  });
});

describe('syncPush', () => {
  it('never asks for permission', async () => {
    const d = device({ perm: 'default' });
    await expect(syncPush(d, session)).resolves.toBe(false);
    expect(d.requestPermission).not.toHaveBeenCalled();
    expect(d.getToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('registers the token for the signed-in user, then remembers it', async () => {
    const d = device();
    await expect(syncPush(d, session)).resolves.toBe(true);
    expect(calls()).toEqual([{ path: '/notifications/register-token', method: 'POST',
      body: { token: 'fcm-1' }, auth: 'Bearer id-token-A' }]);
    expect(d.remembered()).toEqual({ uid: 'uid-A', token: 'fcm-1' });
  });

  it('does not post again when the same user already registered this token', async () => {
    const d = device();
    await syncPush(d, session);
    await syncPush(d, session);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('re-registers when another account signs in on this browser', async () => {
    const d = device();
    await syncPush(d, session);
    await syncPush(d, { uid: 'uid-B', credential: 'id-token-B' });
    expect(calls().map((c) => c.auth)).toEqual(['Bearer id-token-A', 'Bearer id-token-B']);
    expect(d.remembered()).toEqual({ uid: 'uid-B', token: 'fcm-1' });
  });

  it('re-registers when FCM rotated the token', async () => {
    let token = 'fcm-1';
    const d = device({ getToken: vi.fn(async () => token) });
    await syncPush(d, session);
    token = 'fcm-2';
    await syncPush(d, session);
    expect(calls().map((c) => c.body.token)).toEqual(['fcm-1', 'fcm-2']);
  });

  it('remembers nothing when the server refuses', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'boom' }), { status: 500 }));
    const d = device();
    await expect(syncPush(d, session)).rejects.toBeTruthy();
    expect(d.remembered()).toBeNull();
  });

  it('remembers nothing when the server does not know the user yet', async () => {
    // `registerToken` répond 200 `user_not_found` au lieu de lever.
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'user_not_found' } }), { status: 200 }));
    const d = device();
    await expect(syncPush(d, session)).resolves.toBe(false);
    expect(d.remembered()).toBeNull();
  });
});

describe('enablePush', () => {
  it('asks for permission on demand, then registers', async () => {
    const d = device({ perm: 'default' });
    await expect(enablePush(d, session)).resolves.toBe('granted');
    expect(d.requestPermission).toHaveBeenCalledTimes(1);
    expect(calls()).toHaveLength(1);
  });

  it('stops on refusal without contacting the server', async () => {
    const d = device({ perm: 'default', requestPermission: vi.fn(async () => 'denied' as const) });
    await expect(enablePush(d, session)).resolves.toBe('denied');
    expect(d.getToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not ask again once the browser blocked notifications', async () => {
    const d = device({ perm: 'denied' });
    await expect(enablePush(d, session)).resolves.toBe('denied');
    expect(d.requestPermission).not.toHaveBeenCalled();
  });

  it('fails when the server did not record the token, instead of claiming success', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'user_not_found' } }), { status: 200 }));
    const d = device({ perm: 'default' });
    await expect(enablePush(d, session)).rejects.toBeTruthy();
  });

  it('reports an unsupported browser', async () => {
    const d = device({ supported: vi.fn(async () => false) });
    await expect(enablePush(d, session)).resolves.toBe('unsupported');
    expect(d.requestPermission).not.toHaveBeenCalled();
  });
});

describe('releasePush', () => {
  it('unregisters on the server, then unsubscribes the browser', async () => {
    const d = device();
    await syncPush(d, session);
    fetch.mockClear();
    await releasePush(d, 'id-token-A');
    expect(calls()).toEqual([{ path: '/notifications/token', method: 'DELETE',
      body: { token: 'fcm-1' }, auth: 'Bearer id-token-A' }]);
    expect(d.deleteToken).toHaveBeenCalledTimes(1);
    expect(d.remembered()).toBeNull();
  });

  it('still unsubscribes the browser when the server call fails', async () => {
    // C'est le désabonnement local qui garantit que le compte suivant ne
    // reçoit pas les notifications du précédent : le jeton mort sera purgé
    // par le backend au prochain envoi.
    const d = device();
    await syncPush(d, session);
    fetch.mockRejectedValueOnce(new TypeError('offline'));
    await expect(releasePush(d, 'id-token-A')).resolves.toBeUndefined();
    expect(d.deleteToken).toHaveBeenCalledTimes(1);
    expect(d.remembered()).toBeNull();
  });

  it('does not wait forever for the server', async () => {
    vi.useFakeTimers();
    try {
      const d = device();
      await syncPush(d, session);
      fetch.mockImplementationOnce(() => new Promise(() => {}));
      const done = releasePush(d, 'id-token-A', 3000);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(done).resolves.toBeUndefined();
      expect(d.deleteToken).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unsubscribes locally without credential (expired session)', async () => {
    const d = device();
    await syncPush(d, session);
    fetch.mockClear();
    await releasePush(d, null);
    expect(fetch).not.toHaveBeenCalled();
    expect(d.deleteToken).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a browser that never enabled notifications', async () => {
    const d = device({ perm: 'default' });
    await releasePush(d, 'id-token-A');
    expect(fetch).not.toHaveBeenCalled();
    expect(d.deleteToken).not.toHaveBeenCalled();
  });

  it('an enrolment still in flight does not resurrect the token after logout', async () => {
    // getToken lent : la déconnexion passe pendant ce temps.
    let release!: (token: string) => void;
    const d = device({ getToken: vi.fn(() => new Promise<string>((resolve) => { release = resolve; })) });
    const enrolment = syncPush(d, session);
    await vi.waitFor(() => expect(d.getToken).toHaveBeenCalled());
    await releasePush(d, 'id-token-A');
    release('fcm-1');
    await expect(enrolment).resolves.toBe(false);
    expect(fetch.mock.calls.filter(([, init]: [string, RequestInit]) => init.method === 'POST')).toHaveLength(0);
    expect(d.remembered()).toBeNull();
  });

  it('a server answer arriving after logout is not remembered', async () => {
    let answer!: (r: Response) => void;
    fetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { answer = resolve; }));
    const d = device();
    const enrolment = syncPush(d, session);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await releasePush(d, 'id-token-A');
    answer(registered());
    await expect(enrolment).resolves.toBe(false);
    expect(d.remembered()).toBeNull();
  });

  it('never throws, even when the browser refuses to unsubscribe', async () => {
    const d = device({ deleteToken: vi.fn(async () => { throw new Error('sw gone'); }) });
    await syncPush(d, session);
    await expect(releasePush(d, 'id-token-A')).resolves.toBeUndefined();
  });
});
