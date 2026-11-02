import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiClientRaw, ApiError, sessionFetch } from './client';
import { SessionObsoleteError, type SessionCredential } from './auth-session';

function session() {
  let current = true;
  const controller = new AbortController();
  const credential: SessionCredential = {
    uid: 'synthetic-A', generation: 1, signal: controller.signal,
    isCurrent: () => current, getToken: () => 'old-token',
    refresh: vi.fn(async () => 'fresh-token'), onAuthError: vi.fn(async () => {}),
  };
  return { credential, retire: () => { current = false; controller.abort(); } };
}
const response = (status: number, data: unknown) => ({ ok: status < 400, status, json: async () => data });
afterEach(() => vi.unstubAllGlobals());

describe('session-bound HTTP', () => {
  it('reuses a completed refresh for a delayed concurrent 401', async () => {
    const s = session();
    let token = 'old-token';
    s.credential.getToken = () => token;
    s.credential.refresh = vi.fn(async () => { token = 'fresh-token'; return token; });
    let release!: (value: ReturnType<typeof response>) => void;
    const delayed = new Promise<ReturnType<typeof response>>((resolve) => { release = resolve; });
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(401, { message: 'Expired' }))
      .mockReturnValueOnce(delayed)
      .mockResolvedValue(response(200, { data: 'current' }));
    vi.stubGlobal('fetch', fetch);
    const first = apiClient('/users/me', { token: s.credential });
    const second = apiClient('/orders', { token: s.credential });
    await expect(first).resolves.toBe('current');
    release(response(401, { message: 'Expired' }));
    await expect(second).resolves.toBe('current');
    expect(s.credential.refresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('refuses an obsolete identity before network', async () => {
    const s = session(); s.retire(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(SessionObsoleteError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects a late response even when transport ignores abort', async () => {
    const s = session();
    vi.stubGlobal('fetch', vi.fn(async () => { s.retire(); return response(200, { data: { name: 'A' } }); }));
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(SessionObsoleteError);
  });
  it('checks identity again after decoding the body', async () => {
    const s = session();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => { s.retire(); return { data: 'private A' }; } })));
    await expect(apiClientRaw('/users/me', { token: s.credential })).rejects.toBeInstanceOf(SessionObsoleteError);
  });
  it('combines query cancellation and session cancellation', async () => {
    const s = session(), query = new AbortController(); let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => { signal = options.signal; return response(200, { data: true }); }));
    await apiClient('/users/me', { token: s.credential, signal: query.signal });
    query.abort(); expect(signal?.aborted).toBe(true);
  });
  it('refreshes and replays a GET once with the new token', async () => {
    const s = session(); const fetch = vi.fn().mockResolvedValueOnce(response(401, { message: 'Expired' })).mockResolvedValueOnce(response(200, { data: 3 })); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/users/me', { token: s.credential })).resolves.toBe(3);
    expect(s.credential.refresh).toHaveBeenCalledTimes(1);
    expect(new Headers(fetch.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer fresh-token');
  });
  it('does not replay a write after 401', async () => {
    const s = session(); const fetch = vi.fn(async () => response(401, { message: 'Expired' })); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/orders', { token: s.credential, method: 'POST', body: '{}' })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1); expect(s.credential.refresh).not.toHaveBeenCalled(); expect(s.credential.onAuthError).toHaveBeenCalledTimes(1);
  });
  it.each(['ACCOUNT_REVOKED', 'ACCOUNT_NOT_SYNCED'])('reports %s without retry', async (code) => {
    const s = session(); const fetch = vi.fn(async () => response(403, { message: code, error: { code } })); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(ApiError);
    expect(s.credential.onAuthError).toHaveBeenCalledWith(expect.objectContaining({ code })); expect(s.credential.refresh).not.toHaveBeenCalled();
  });
  it('does not close a session for a business 403', async () => {
    const s = session(); vi.stubGlobal('fetch', vi.fn(async () => response(403, { message: 'Not owner', error: { code: 'FORBIDDEN' } })));
    await expect(apiClient('/orders/other', { token: s.credential })).rejects.toBeInstanceOf(ApiError);
    expect(s.credential.onAuthError).not.toHaveBeenCalled();
  });
  it('preserves plain-token admin behavior without refresh', async () => {
    const fetch = vi.fn(async () => response(401, { message: 'Expired' })); vi.stubGlobal('fetch', fetch);
    await expect(apiClientRaw('/admin/orders', { token: 'legacy-token' })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0]?.[1]).toBeDefined();
  });
  it('never replays after a session change during refresh', async () => {
    const s = session();
    s.credential.refresh = vi.fn(async () => { s.retire(); return 'late-A'; });
    const fetch = vi.fn(async () => response(401, { message: 'Expired' })); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(SessionObsoleteError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports the second 401 without an infinite refresh loop', async () => {
    const s = session(); const fetch = vi.fn(async () => response(401, { message: 'Revoked' })); vi.stubGlobal('fetch', fetch);
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(2); expect(s.credential.refresh).toHaveBeenCalledTimes(1); expect(s.credential.onAuthError).toHaveBeenCalledTimes(1);
  });
  it('classifies a body failure after logout as obsolete rather than a current error', async () => {
    const s = session();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { s.retire(); throw new Error('Body failed'); } })));
    await expect(apiClient('/users/me', { token: s.credential })).rejects.toBeInstanceOf(SessionObsoleteError);
  });

  it('authenticates a direct FormData upload without adding a JSON content type', async () => {
    const s = session(); const fetch = vi.fn(async (_url: string, _options: RequestInit) => response(200, {})); vi.stubGlobal('fetch', fetch);
    const body = new FormData(); body.set('file', 'synthetic-image');
    await sessionFetch('/synthetic-upload', s.credential, { method: 'POST', body });
    const sent = fetch.mock.calls[0][1];
    expect(new Headers(sent.headers).get('Authorization')).toBe('Bearer old-token');
    expect(new Headers(sent.headers).has('Content-Type')).toBe(false);
    expect(sent.body).toBe(body);
  });
  it('uses the bound identity rather than an obsolete explicit Authorization header', async () => {
    const s = session(); const fetch = vi.fn(async (_url: string, _options: RequestInit) => response(200, {})); vi.stubGlobal('fetch', fetch);
    await sessionFetch('/synthetic-upload', s.credential, { headers: { Authorization: 'Bearer another-account' } });
    expect(new Headers(fetch.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer old-token');
  });

});
