import { describe, expect, it } from 'vitest';
import { PRODUCTION_API_URL, TEST_API_URL, resolveApiUrl, serverSideExplicit } from './api-url';

describe('resolveApiUrl (CFG-001)', () => {
  it('une valeur explicite gagne partout', () => {
    for (const nodeEnv of ['development', 'test', 'production']) {
      expect(resolveApiUrl({ explicit: 'http://localhost:3001/', nodeEnv })).toBe('http://localhost:3001');
    }
  });
  it('development sans variable : erreur, jamais la production', () => {
    expect(() => resolveApiUrl({ explicit: undefined, nodeEnv: 'development' })).toThrow(/NEXT_PUBLIC_API_URL/);
    expect(() => resolveApiUrl({ explicit: '  ', nodeEnv: 'development' })).toThrow();
  });
  it('NODE_ENV absent (outil lancé à la main) : traité comme du développement', () => {
    expect(() => resolveApiUrl({ explicit: undefined, nodeEnv: undefined })).toThrow();
  });
  it('test sans variable : hôte .invalid', () => {
    expect(resolveApiUrl({ explicit: undefined, nodeEnv: 'test' })).toBe(TEST_API_URL);
  });
  it('production (prod et preview Vercel) sans variable : repli inchangé', () => {
    expect(resolveApiUrl({ explicit: undefined, nodeEnv: 'production' })).toBe(PRODUCTION_API_URL);
  });
});

describe('serverSideExplicit', () => {
  it('API_URL d’abord', () => {
    expect(serverSideExplicit('http://a', 'http://b')).toBe('http://a');
  });
  it('sinon NEXT_PUBLIC_API_URL si absolue — le rendu serveur local ne part plus en prod', () => {
    expect(serverSideExplicit(undefined, 'http://localhost:3001')).toBe('http://localhost:3001');
  });
  it('une URL relative (/api-proxy) est ignorée côté serveur', () => {
    expect(serverSideExplicit(undefined, '/api-proxy')).toBeUndefined();
  });
});
