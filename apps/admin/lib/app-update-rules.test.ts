import { describe, expect, it } from 'vitest';
import {
  ANDROID_APPLICATION_ID,
  compareAppVersions,
  isAllowedAndroidStoreUrl,
  isAllowedIosStoreUrl,
  normalizeVersion,
  parseAppVersion,
  requiresBlockConfirmation,
  validateAppUpdate,
} from './app-update-rules';

/**
 * Mêmes vecteurs que `app-update-policy.spec.ts` (backend),
 * `app_update_rules_test.dart` (Admin Flutter) et `app_version_test.dart`
 * (lilia-app). Un verdict qui diverge ici annoncerait à l'administrateur une
 * règle que le serveur n'applique pas.
 */
const v = (s: string) => {
  const p = parseAppVersion(s);
  if (!p) throw new Error(`illisible : ${s}`);
  return p;
};

describe('parseAppVersion', () => {
  it.each(['1.2.0', '1.10.0', '2.0.0', '1.3.0+34', ' 1.3.0 ', 'v1.3.0'])('lit %s', (s) => {
    expect(parseAppVersion(s)).not.toBeNull();
  });
  it.each(['1.3', '1.3.0-beta', '1.3.0+', 'abc', '', '1.3.0.4'])('refuse %p', (s) => {
    expect(parseAppVersion(s)).toBeNull();
  });
});

describe('compareAppVersions', () => {
  it.each([
    ['1.2.0', '1.3.0'],
    ['1.9.0', '1.10.0'],
    ['1.10.0', '2.0.0'],
    ['1.3.0+34', '1.3.0+35'],
    ['1.3.0+35', '1.3.0+40'],
  ])('%s < %s', (a, b) => {
    expect(compareAppVersions(v(a), v(b))).toBeLessThan(0);
  });
  it('le build ne départage que si les deux en portent un', () => {
    expect(compareAppVersions(v('1.3.0'), v('1.3.0+34'))).toBe(0);
  });
});

describe('normalizeVersion', () => {
  it('forme canonique à envoyer', () => {
    expect(normalizeVersion(' v1.3.0 ')).toBe('1.3.0');
    expect(normalizeVersion('1.3.0+34')).toBe('1.3.0+34');
  });
  it('vide → null, jamais ""', () => {
    expect(normalizeVersion('')).toBeNull();
    expect(normalizeVersion('   ')).toBeNull();
  });
  it('illisible → renvoyé tel quel, pour que le serveur le refuse', () => {
    expect(normalizeVersion('1.3')).toBe('1.3');
  });
});

describe('URL de store (miroir du serveur)', () => {
  it('Android : fiche Play de Lilia Food', () => {
    expect(
      isAllowedAndroidStoreUrl(`https://play.google.com/store/apps/details?id=${ANDROID_APPLICATION_ID}`),
    ).toBe(true);
    expect(isAllowedAndroidStoreUrl(`market://details?id=${ANDROID_APPLICATION_ID}`)).toBe(true);
  });
  it.each([
    'https://example.com/typo',
    'https://play.google.com/store/apps/details?id=com.lilia.food',
    `https://play.google.com@evil.com/store/apps/details?id=${ANDROID_APPLICATION_ID}`,
    'javascript:alert(1)',
  ])('Android refuse %s', (url) => {
    expect(isAllowedAndroidStoreUrl(url)).toBe(false);
  });
  it('iOS : fiche App Store', () => {
    expect(isAllowedIosStoreUrl('https://apps.apple.com/app/lilia-food/id1234567890')).toBe(true);
    expect(isAllowedIosStoreUrl('https://apps.apple.com/fr/app/lilia-food/id1234567890')).toBe(true);
  });
  it.each([
    'https://apps.apple.com/app/lilia-food/id6740000000',
    'https://apps.apple.com/search?term=Lilia%20Food',
    'https://example.com/app/id1234567890',
  ])('iOS refuse %s', (url) => {
    expect(isAllowedIosStoreUrl(url)).toBe(false);
  });
});

describe('validateAppUpdate', () => {
  const base = { minVersion: '', latestVersion: '', urlAndroid: '', urlIos: '' };

  it('tout vide : rien à redire', () => {
    expect(validateAppUpdate(base)).toEqual([]);
  });
  it('min exige latest', () => {
    expect(validateAppUpdate({ ...base, minVersion: '1.3.0' })).toHaveLength(1);
  });
  it('min > latest refusé', () => {
    expect(validateAppUpdate({ ...base, minVersion: '2.0.0', latestVersion: '1.3.0' })).toHaveLength(1);
    expect(validateAppUpdate({ ...base, minVersion: '1.10.0', latestVersion: '1.9.0' })).toHaveLength(1);
  });
  it('min = latest accepté', () => {
    expect(validateAppUpdate({ ...base, minVersion: '1.3.0', latestVersion: '1.3.0' })).toEqual([]);
  });
  it('asymétrie de build : min avec build, latest sans → refusé', () => {
    expect(validateAppUpdate({ ...base, minVersion: '1.3.0+40', latestVersion: '1.3.0' })).toHaveLength(1);
  });
  it('min sans build, latest avec build → accepté', () => {
    expect(validateAppUpdate({ ...base, minVersion: '1.3.0', latestVersion: '1.3.0+41' })).toEqual([]);
  });
  it('version invalide signalée', () => {
    expect(validateAppUpdate({ ...base, latestVersion: 'abc' })[0]).toMatch(/format/);
  });
  it('ne juge que ce que le PATCH touche', () => {
    expect(
      validateAppUpdate(
        { ...base, minVersion: '2.0.0', latestVersion: '1.0.0', urlIos: 'https://example.com' },
        { versions: false, urlAndroid: false, urlIos: false },
      ),
    ).toEqual([]);
  });
});

describe('requiresBlockConfirmation', () => {
  it('poser un blocage → confirmation', () => {
    expect(requiresBlockConfirmation('1.3.0', null)).toBe(true);
  });
  it('modifier un blocage → confirmation', () => {
    expect(requiresBlockConfirmation('1.4.0', '1.3.0')).toBe(true);
  });
  it('lever un blocage → aucune confirmation', () => {
    expect(requiresBlockConfirmation('', '1.3.0')).toBe(false);
  });
  it('ne rien changer → aucune confirmation (même écrit « v1.3.0 »)', () => {
    expect(requiresBlockConfirmation('1.3.0', '1.3.0')).toBe(false);
    expect(requiresBlockConfirmation(' v1.3.0', '1.3.0')).toBe(false);
  });
});
