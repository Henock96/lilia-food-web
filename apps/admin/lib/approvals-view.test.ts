import { describe, expect, it } from 'vitest';
import type { FinancialApproval } from '@lilia/types';

import {
  approvalActions,
  describeApproval,
  expiresLabel,
  isApprovalRequested,
} from './approvals-view';

const base = (over: Partial<FinancialApproval> = {}): FinancialApproval => ({
  id: 'ap1',
  kind: 'PAYOUT_ACCOUNT_CHANGE',
  refId: 'r1',
  payload: { payoutPhoneNumber: '242069999999', payoutProvider: 'MTN_MOMO' },
  amountXaf: null,
  requestedBy: 'a1',
  approvedBy: null,
  status: 'PENDING',
  reason: null,
  expiresAt: '2026-09-26T12:00:00.000Z',
  createdAt: '2026-09-25T12:00:00.000Z',
  decidedAt: null,
  ...over,
});

describe('approvalActions (F3-08)', () => {
  it('le demandeur ne voit jamais « Approuver », il peut retirer', () => {
    expect(
      approvalActions(base(), { id: 'a1', capabilities: ['FINANCE_APPROVE'] }),
    ).toEqual({ approve: false, reject: false, withdraw: true });
  });

  it('un autre admin avec FINANCE_APPROVE approuve ou refuse', () => {
    expect(
      approvalActions(base(), { id: 'a2', capabilities: ['FINANCE_APPROVE'] }),
    ).toEqual({ approve: true, reject: true, withdraw: false });
  });

  it('un autre admin sans FINANCE_APPROVE peut seulement refuser', () => {
    expect(approvalActions(base(), { id: 'a3', capabilities: ['SUPPORT'] })).toEqual({
      approve: false,
      reject: true,
      withdraw: false,
    });
  });

  it('une demande traitée n’offre plus aucun geste', () => {
    for (const status of ['APPROVED', 'REJECTED', 'EXPIRED', 'CONSUMED'] as const) {
      expect(
        approvalActions(base({ status }), { id: 'a2', capabilities: ['FINANCE_APPROVE'] }),
      ).toEqual({ approve: false, reject: false, withdraw: false });
    }
  });
});

describe('describeApproval', () => {
  it('numéro de versement : le numéro complet, à vérifier auprès du vendeur', () => {
    expect(describeApproval(base()).detail).toContain('242069999999');
  });

  it('remboursement : le montant', () => {
    expect(
      describeApproval(base({ kind: 'REFUND_EXECUTION', amountXaf: 60000, payload: {} })).title,
    ).toMatch(/60\s000 FCFA/);
  });

  it('capacités : en clair ; aucune = retrait de tous les droits', () => {
    expect(
      describeApproval(base({ kind: 'CAPABILITY_GRANT', payload: { capabilities: ['FINANCE_APPROVE'] } })).detail,
    ).toBe('Approuver un geste financier');
    expect(
      describeApproval(base({ kind: 'CAPABILITY_GRANT', payload: { capabilities: [] } })).detail,
    ).toMatch(/retrait/);
  });
});

describe('outils', () => {
  it('expiration lisible', () => {
    const now = new Date('2026-09-26T09:00:00.000Z');
    expect(expiresLabel('2026-09-26T12:00:00.000Z', now)).toBe('expire dans 3 h');
    expect(expiresLabel('2026-09-26T08:00:00.000Z', now)).toBe('expirée');
  });

  it('reconnaît une réponse « approbation requise »', () => {
    expect(isApprovalRequested({ approvalRequired: true, approval: {} })).toBe(true);
    expect(isApprovalRequested({ id: 'r1', nom: 'x' })).toBe(false);
  });
});
