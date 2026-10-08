import { describe, expect, it } from 'vitest';
import { ApiError } from '@lilia/api-client';

import {
  APPROVAL_REQUIRED_MESSAGE,
  canTransferRefund,
  composedRefundOutcome,
  refundErrorOutcome,
  refundResultOutcome,
} from './refund-outcome';

/**
 * R-01 — un geste sur un remboursement a QUATRE issues, jamais deux :
 * succès, approbation requise, double authentification, erreur.
 *
 * La file affichait « Remboursement : remboursé » sur toute réponse 2xx. Une
 * demande d'approbation est une réponse 2xx où RIEN n'a changé : l'annoncer
 * comme un succès ferait croire au client payé, comme une erreur ferait
 * relancer le geste.
 */
describe('refundResultOutcome', () => {
  it('approvalRequired → « approbation requise », ni succès ni erreur', () => {
    const outcome = refundResultOutcome({
      approvalRequired: true,
      approval: { id: 'ap-1' },
    });
    expect(outcome).toEqual({
      kind: 'APPROVAL_REQUIRED',
      message: expect.stringMatching(/approbation d’un autre administrateur/),
    });
    expect(outcome).toMatchObject({ message: expect.stringMatching(/rien ne change/i) });
  });

  it('un remboursement mis à jour → succès', () => {
    expect(refundResultOutcome({ id: 'r-1', status: 'COMPLETED' }).kind).toBe(
      'SUCCESS',
    );
  });

  it('un virement envoyé au prestataire → succès, avec le message du serveur', () => {
    const outcome = refundResultOutcome({
      status: 'PROCESSING',
      message: 'Virement de remboursement envoyé.',
    });
    expect(outcome).toEqual({
      kind: 'SUCCESS',
      message: 'Virement de remboursement envoyé.',
    });
  });

  it('une valeur inattendue n’est jamais une approbation', () => {
    expect(refundResultOutcome({ approvalRequired: 'true' }).kind).toBe('SUCCESS');
    expect(refundResultOutcome(null).kind).toBe('SUCCESS');
  });
});

describe('refundErrorOutcome', () => {
  it('401 MFA_STEP_UP_REQUIRED → MFA (le dialogue global prend la main)', () => {
    expect(
      refundErrorOutcome(
        new ApiError(401, 'Confirmez votre identité', 'MFA_STEP_UP_REQUIRED'),
      ).kind,
    ).toBe('MFA');
  });

  it('403 MFA_REQUIRED → MFA (inscription demandée par le toast global)', () => {
    expect(
      refundErrorOutcome(new ApiError(403, 'x', 'MFA_REQUIRED')).kind,
    ).toBe('MFA');
  });

  it('403 sans capacité → refus, message du serveur', () => {
    expect(
      refundErrorOutcome(
        new ApiError(403, 'Votre compte n’a pas la capacité requise.', 'CAPABILITY_REQUIRED'),
      ),
    ).toEqual({
      kind: 'FORBIDDEN',
      message: 'Votre compte n’a pas la capacité requise.',
    });
  });

  it('409 (virement en vol, déjà clos, demande déjà en attente) → erreur, message du serveur', () => {
    expect(
      refundErrorOutcome(
        new ApiError(409, 'Un virement est en cours.', 'REFUND_PROVIDER_IN_FLIGHT'),
      ),
    ).toEqual({ kind: 'ERROR', message: 'Un virement est en cours.' });
  });

  it('5xx et réseau → erreur, sans jamais prétendre que le geste est passé', () => {
    expect(refundErrorOutcome(new ApiError(500, '')).kind).toBe('ERROR');
    expect(refundErrorOutcome(new TypeError('Failed to fetch'))).toEqual({
      kind: 'ERROR',
      message: 'Impossible de joindre le serveur. Vérifiez la file avant de relancer.',
    });
  });
});

describe('canTransferRefund', () => {
  const pending = { status: 'PENDING' as const, providerRefundId: null };

  it('en attente, rail capable de verser → bouton proposé', () => {
    expect(canTransferRefund(pending, 'PAWAPAY')).toBe(true);
  });

  it('mode manuel : aucun virement automatique possible (le serveur répond 400)', () => {
    expect(canTransferRefund(pending, 'MANUAL')).toBe(false);
  });

  it('rail encore inconnu : on ne promet rien', () => {
    expect(canTransferRefund(pending, undefined)).toBe(false);
  });

  it('déjà en cours ou clos : rien à virer', () => {
    expect(canTransferRefund({ ...pending, status: 'PROCESSING' }, 'PAWAPAY')).toBe(false);
    expect(canTransferRefund({ ...pending, status: 'COMPLETED' }, 'PAWAPAY')).toBe(false);
  });
});

describe('composedRefundOutcome', () => {
  it('au-delà du seuil : approbation requise, message canonique, même sans approvalId', () => {
    expect(
      composedRefundOutcome({ executed: false, message: 'brut', approvalRequired: true }),
    ).toEqual({ kind: 'APPROVAL_REQUIRED', message: APPROVAL_REQUIRED_MESSAGE });
  });

  it('virement parti → envoyé ; refus du prestataire → laissé en file avec le motif', () => {
    expect(composedRefundOutcome({ executed: true, message: '' })).toEqual({ kind: 'SENT' });
    expect(
      composedRefundOutcome({ executed: false, message: 'Virement non parti : wallet vide' }),
    ).toEqual({ kind: 'QUEUED', message: 'Virement non parti : wallet vide' });
  });
});
