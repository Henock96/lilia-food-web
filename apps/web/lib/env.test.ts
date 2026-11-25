import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'synthetic-env-test-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'env-test.invalid',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'env-test',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'env-test.invalid',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:synthetic',
};

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries(firebaseEnv)) vi.stubEnv(key, value);
  vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validation de la configuration publique (migration Zod)', () => {
  it('accepte la configuration Firebase sans URL API optionnelle', async () => {
    const { clientEnv } = await import('./env');
    expect(clientEnv).toEqual({ ...firebaseEnv, NEXT_PUBLIC_API_URL: undefined });
  });

  it('conserve une URL API absolue valide', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.env-test.invalid/v1');
    const { clientEnv } = await import('./env');
    expect(clientEnv.NEXT_PUBLIC_API_URL).toBe('https://api.env-test.invalid/v1');
  });

  it.each(Object.keys(firebaseEnv))('refuse le champ requis absent : %s', async (key) => {
    vi.stubEnv(key, undefined);
    await expect(import('./env')).rejects.toThrow(`invalides ou manquantes : ${key}.`);
  });

  it.each(Object.keys(firebaseEnv))('refuse le champ requis vide : %s', async (key) => {
    vi.stubEnv(key, '');
    await expect(import('./env')).rejects.toThrow(`invalides ou manquantes : ${key}.`);
  });

  it.each(['', '/api-proxy', 'not-an-url'])('refuse une URL API invalide : %s', async (url) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', url);
    await expect(import('./env')).rejects.toThrow('NEXT_PUBLIC_API_URL');
  });

  it('signale tous les champs invalides sans exposer leurs valeurs', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'invalid-private-test-value');
    const error = await import('./env').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    expect(message).toContain('NEXT_PUBLIC_API_URL');
    expect(message).not.toContain('invalid-private-test-value');
    expect(message).not.toContain(firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY);
  });
});
