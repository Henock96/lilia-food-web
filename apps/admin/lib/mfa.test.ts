import { describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({}) }));

import { ApiError } from '@lilia/api-client';
import { isMfaChallenge, isTotpCode, mfaDemand, mfaErrorMessage, pickTotpHint } from './mfa';

describe('double authentification (F3-08)', () => {
  it('reconnaît le défi de second facteur de Firebase', () => {
    expect(isMfaChallenge({ code: 'auth/multi-factor-auth-required' })).toBe(true);
    expect(isMfaChallenge({ code: 'auth/wrong-password' })).toBe(false);
    expect(isMfaChallenge(null)).toBe(false);
  });

  it('traduit les refus du serveur : inscription ou réauthentification', () => {
    expect(mfaDemand(new ApiError(403, 'x', 'MFA_REQUIRED'))).toBe('ENROLL');
    expect(mfaDemand(new ApiError(401, 'x', 'MFA_STEP_UP_REQUIRED'))).toBe('STEP_UP');
    expect(mfaDemand(new ApiError(403, 'x', 'CAPABILITY_REQUIRED'))).toBeNull();
    expect(mfaDemand(new Error('réseau'))).toBeNull();
  });

  it('choisit le facteur TOTP, ignore les autres', () => {
    expect(pickTotpHint([{ factorId: 'phone', uid: 'p' }, { factorId: 'totp', uid: 't' }])?.uid).toBe('t');
    expect(pickTotpHint([{ factorId: 'phone', uid: 'p' }])).toBeNull();
  });

  it('un code d’application compte 6 chiffres', () => {
    expect(isTotpCode('123456')).toBe(true);
    for (const bad of ['12345', '1234567', 'abcdef', ' 123456']) expect(isTotpCode(bad)).toBe(false);
  });

  it('messages lisibles, dont le projet Firebase sans MFA activée', () => {
    expect(mfaErrorMessage({ code: 'auth/invalid-verification-code' })).toMatch(/Code incorrect/);
    expect(mfaErrorMessage({ code: 'auth/operation-not-allowed' })).toMatch(/pas encore activée/);
  });
});
