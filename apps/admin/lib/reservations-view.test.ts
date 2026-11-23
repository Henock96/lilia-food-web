import { describe, expect, it } from 'vitest';
import type { ReservationStatus } from '@lilia/types';

import {
  bpsLabel,
  cancelConsequence,
  cancelReasonError,
  canRequestNoShowPayout,
  RESERVATION_STATUS_FILTERS,
  RESERVATION_STATUS_LABELS,
  reservationStatusTone,
  shortRef,
} from './reservations-view';

describe('D-6 — réservations vues du support', () => {
  const statuses = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];

  it('chaque statut a un libellé, une couleur et un filtre', () => {
    expect(statuses).toHaveLength(9);
    const filtered = RESERVATION_STATUS_FILTERS.map((f) => f.value);
    for (const s of statuses) {
      expect(filtered).toContain(s);
      expect(reservationStatusTone(s)).toBeTruthy();
    }
  });

  it('motif d’annulation : mêmes bornes que le serveur (10 à 500, espaces ignorés)', () => {
    expect(cancelReasonError('   court   ')).toMatch(/10 caractères/);
    expect(cancelReasonError('Restaurant fermé ce jour')).toBeNull();
    expect(cancelReasonError('x'.repeat(501))).toMatch(/500/);
  });

  it('conséquence annoncée : remboursement seulement si payée, jamais de virement d’ici', () => {
    expect(cancelConsequence({ total: 11500 })).toMatch(/remboursé de 11\s500 FCFA/);
    expect(cancelConsequence({ total: 11500 })).toMatch(/aucun virement/);
    expect(cancelConsequence(null)).toMatch(/Rien n’a été payé/);
  });

  it('versement de la part : proposé seulement quand le serveur la dit due', () => {
    expect(canRequestNoShowPayout({ payoutState: 'DUE' })).toBe(true);
    for (const s of ['NOTHING_DUE', 'IN_PROGRESS', 'PAID'] as const) {
      expect(canRequestNoShowPayout({ payoutState: s })).toBe(false);
    }
  });

  it('outils', () => {
    expect(bpsLabel(5000)).toBe('50 %');
    expect(bpsLabel(3750)).toBe('37,5 %');
    expect(shortRef('cmabc123xyz9')).toBe('#23XYZ9');
  });
});
