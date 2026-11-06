import { describe, expect, it } from 'vitest';
import { EMAIL_ALREADY_REGISTERED, googleAuthFailureMessage } from './auth-errors';

const FALLBACK = 'Inscription Google échouée';

describe('googleAuthFailureMessage', () => {
  it('demande remplacée par un second clic : aucun message', () => {
    expect(googleAuthFailureMessage({ code: 'auth/cancelled-popup-request' }, FALLBACK)).toBeNull();
  });

  it('fenêtre fermée : message neutre, un navigateur intégré la ferme parfois tout seul', () => {
    expect(googleAuthFailureMessage({ code: 'auth/popup-closed-by-user' }, FALLBACK)).toContain('Réessayez');
  });

  it('fenêtre bloquée : dit quoi faire', () => {
    expect(googleAuthFailureMessage({ code: 'auth/popup-blocked' }, FALLBACK)).toContain('Autorisez');
  });

  it.each([[{ code: 'auth/internal-error' }], [new Error('boom')], [null], [undefined]])(
    'autre échec (%p) : repli de la page',
    (error) => {
      expect(googleAuthFailureMessage(error, FALLBACK)).toBe(FALLBACK);
    },
  );
});

describe('EMAIL_ALREADY_REGISTERED', () => {
  it('dit de se connecter : un client déjà inscrit ne le devine pas', () => {
    expect(EMAIL_ALREADY_REGISTERED).toContain('Connectez-vous');
  });
});
