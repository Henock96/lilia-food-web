import { describe, expect, it } from 'vitest';
import { pushRoute } from './push-routes';

describe('pushRoute (administration)', () => {
  it.each(['new_order', 'order_update', 'order_cancelled_restaurant', 'status_update_restaurant',
    'payout_succeeded', 'payout_failed', 'delivery_unassigned', 'default'])(
    '%s with an order opens that order',
    (type) => {
      expect(pushRoute({ type, orderId: 'cmh1abc' })).toBe('/commandes?q=cmh1abc');
    },
  );

  it('an order notification without order id opens the order list', () => {
    expect(pushRoute({ type: 'new_order' })).toBe('/commandes');
    expect(pushRoute({ type: 'payout_failed' })).toBe('/commandes');
  });

  it('admin alerts open their screen', () => {
    expect(pushRoute({ type: 'incident', incidentId: 'i1' })).toBe('/incidents/i1');
    expect(pushRoute({ type: 'incident' })).toBe('/incidents');
    expect(pushRoute({ type: 'approval_requested', approvalId: 'a1' })).toBe('/approbations');
    expect(pushRoute({ type: 'vendor_pending_approval', vendorId: 'v1' })).toBe('/vendeurs');
    expect(pushRoute({ type: 'vendor_ready', vendorId: 'v1' })).toBe('/vendeurs');
  });

  it.each(['vendor_approved', 'vendor_activated', 'vendor_suspended', 'payout_account_changed',
    'preorder_reminder', 'vendor_offer', 'reservation_update', 'reservation_daily_summary'])(
    'vendor news %s opens the vendor settings',
    (type) => {
      expect(pushRoute({ type })).toBe('/mon-restaurant');
    },
  );

  it('an unknown type falls back to the dashboard', () => {
    expect(pushRoute({ type: 'something_new' })).toBe('/dashboard');
    expect(pushRoute({})).toBe('/dashboard');
  });

  it.each(['../x', '//evil.example', 'a&b=c', 'https://evil.example', 'a'.repeat(65)])(
    'never builds a path from a malformed id (%s)',
    (bad) => {
      expect(pushRoute({ type: 'new_order', orderId: bad })).toBe('/commandes');
      expect(pushRoute({ type: 'incident', incidentId: bad })).toBe('/incidents');
    },
  );
});
