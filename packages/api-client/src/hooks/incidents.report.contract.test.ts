import { describe, expect, it } from 'vitest';
import { ORDER_ISSUE_KINDS, reportOrderIssueRequest } from './incidents';

/**
 * Contrat du signalement client (F-06) : la route et les motifs doivent être
 * exactement ceux du serveur (`POST /incidents/orders/:orderId/report`,
 * `CUSTOMER_ISSUE_KINDS`), sinon le client reçoit un 400 muet.
 */
describe('reportOrderIssueRequest', () => {
  it('vise la route du serveur, motif en clair', () => {
    expect(reportOrderIssueRequest('o1', 'NOT_RECEIVED')).toEqual({
      path: '/incidents/orders/o1/report',
      body: { kind: 'NOT_RECEIVED' },
    });
  });

  it('n’envoie un message que s’il contient quelque chose', () => {
    expect(reportOrderIssueRequest('o1', 'OTHER', '   ').body).toEqual({
      kind: 'OTHER',
    });
    expect(reportOrderIssueRequest('o1', 'OTHER', ' Porte fermée ').body).toEqual({
      kind: 'OTHER',
      message: 'Porte fermée',
    });
  });

  it('les motifs sont ceux du serveur, ni plus ni moins', () => {
    expect(ORDER_ISSUE_KINDS.map((k) => k.kind)).toEqual([
      'NOT_RECEIVED',
      'WRONG_ORDER',
      'LATE',
      'OTHER',
    ]);
  });
});
