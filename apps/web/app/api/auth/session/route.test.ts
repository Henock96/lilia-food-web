import { describe, expect, it } from 'vitest';
import { DELETE, POST } from './route';

const setCookie = (res: Response) => res.headers.get('set-cookie') ?? '';

describe('POST /api/auth/session', () => {
  it('pose un témoin de présence, jamais le jeton Firebase, sans lire le corps (SEC-07)', async () => {
    // Les onglets ouverts avant ce changement envoient encore `{ token }` :
    // la route ne lit plus le corps, le jeton n'est donc conservé nulle part.
    const res = await POST();
    expect(res.status).toBe(200);
    expect(setCookie(res)).toMatch(/^firebase-token=1;/);
  });

  it('témoin lisible par le client (il ne contient aucun secret), strict, 30 jours', async () => {
    const cookie = setCookie(await POST());
    expect(cookie).not.toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=2592000/);
  });
});

describe('DELETE /api/auth/session', () => {
  it('efface le témoin', async () => {
    const cookie = setCookie(await DELETE());
    expect(cookie).toMatch(/^firebase-token=;/);
    expect(cookie).toMatch(/Max-Age=0/);
  });
});
