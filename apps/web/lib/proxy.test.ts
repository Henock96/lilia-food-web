import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

function visit(path: string, cookie?: string): Promise<Response> {
  return proxy(
    new NextRequest(`https://www.liliafood.com${path}`, {
      headers: cookie ? { cookie: `firebase-token=${cookie}` } : {},
    }),
  );
}

describe('proxy : témoin de session', () => {
  it('page protégée sans témoin : vers la connexion, avec la destination', async () => {
    const res = await visit('/panier');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://www.liliafood.com/connexion?redirect=%2Fpanier');
  });

  it('page protégée avec témoin : servie, sans toucher au cookie', async () => {
    const res = await visit('/commandes', '1');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('ancien cookie qui porte un jeton : servi, et réécrit en témoin (SEC-07)', async () => {
    const res = await visit('/profil', 'synthetic.jwt.token');
    expect(res.headers.get('location')).toBeNull();
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^firebase-token=1;/);
    expect(cookie).not.toContain('synthetic');
    expect(cookie).not.toMatch(/HttpOnly/i);
  });

  it('page publique avec un ancien jeton : le jeton disparaît aussi', async () => {
    const res = await visit('/restaurants', 'synthetic.jwt.token');
    expect(res.headers.get('set-cookie') ?? '').toMatch(/^firebase-token=1;/);
  });

  it('page publique sans cookie : rien à faire', async () => {
    const res = await visit('/');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
