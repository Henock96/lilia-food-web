import { describe, expect, it } from 'vitest';

import { adminReservationsPath } from './admin-reservations';

/** D-6 — la requête respecte le DTO serveur (`AdminReservationsQueryDto`). */
describe('adminReservationsPath', () => {
  it('page et limite seules sans filtre', () => {
    expect(adminReservationsPath({ page: 1 })).toBe('/admin/reservations?page=1&limit=20');
  });

  it('restaurant, statut et jour ; un filtre vide n’est pas envoyé', () => {
    const url = new URL(
      adminReservationsPath({ page: 2, restaurantId: 'v1', status: 'NO_SHOW', date: '2026-11-21' }),
      'http://x',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      limit: '20',
      restaurantId: 'v1',
      status: 'NO_SHOW',
      date: '2026-11-21',
    });
    expect(adminReservationsPath({ page: 1, status: '', date: '' })).not.toMatch(/status|date/);
  });

  it('limite ≤ 100 (plafond serveur)', () => {
    expect(adminReservationsPath({ page: 1 }, 100)).toContain('limit=100');
  });
});
