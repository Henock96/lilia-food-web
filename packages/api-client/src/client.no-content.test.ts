import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiClientRaw } from './client';
import { SessionObsoleteError, type SessionCredential } from './auth-session';
afterEach(() => vi.unstubAllGlobals());
describe.each([apiClient, apiClientRaw])('HTTP no content: %s', client => {
  it.each(['/favorites/restaurant-1', '/cart/clear'])('accepts DELETE 204 %s without decoding', async path => {
    const response = new Response(null, { status: 204 });
    const json = vi.spyOn(response, 'json');
    const fetch = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetch);
    await expect(client<void>(path, { method: 'DELETE', token: 'synthetic' })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['', '{broken'])('rejects malformed JSON on HTTP 200 (%s)', async body => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    await expect(client('/favorites')).rejects.toBeInstanceOf(SyntaxError);
  });
  it('preserves server error status and code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Forbidden', code: 'DENIED' } }), { status: 403 })));
    await expect(client('/favorites', { method: 'DELETE' })).rejects.toMatchObject({ status: 403, code: 'DENIED' });
  });
  it('rejects a late 204 from a retired session', async () => {
    let current = true;
    const token: SessionCredential = { uid: 'synthetic', generation: 1, signal: new AbortController().signal,
      isCurrent: () => current, getToken: () => 'synthetic', refresh: vi.fn(), onAuthError: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async () => { current = false; return new Response(null, { status: 204 }); }));
    await expect(client('/favorites/restaurant-1', { method: 'DELETE', token })).rejects.toBeInstanceOf(SessionObsoleteError);
  });
});
