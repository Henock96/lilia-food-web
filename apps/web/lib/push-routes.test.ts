import { describe, expect, it } from 'vitest';
import { pushRoute } from './push-routes';

describe('pushRoute (client)', () => {
  it.each([
    'order_update', 'status_update', 'order_created', 'order_cancelled', 'payment_confirmed',
    'payment_failed', 'payment_timeout', 'delivery_picked_up', 'delivery_failed_customer',
    'order_acceptance_expired', 'default',
  ])('%s with an order opens that order', (type) => {
    expect(pushRoute({ type, orderId: 'cmh1abc_2-X' })).toBe('/commandes/cmh1abc_2-X');
  });

  it('an order notification without order id opens the order list', () => {
    expect(pushRoute({ type: 'payment_timeout' })).toBe('/commandes');
  });

  it('loyalty and referral open the profile', () => {
    expect(pushRoute({ type: 'loyalty_earned', orderId: 'o1' })).toBe('/profil');
    expect(pushRoute({ type: 'referral_reward' })).toBe('/profil');
  });

  it('a new menu opens the vendor page', () => {
    expect(pushRoute({ type: 'new_menu', restaurantId: 'r1', menuId: 'm1' })).toBe('/restaurants/r1');
    expect(pushRoute({ type: 'new_menu' })).toBe('/restaurants');
  });

  it('an unknown type falls back to home', () => {
    expect(pushRoute({ type: 'something_new' })).toBe('/');
    expect(pushRoute({})).toBe('/');
  });

  it.each(['../admin', '//evil.example', 'a/b', 'x?y=1', 'https://evil.example', 'a'.repeat(65), ''])(
    'never builds a path from a malformed id (%s)',
    (orderId) => {
      const route = pushRoute({ type: 'order_update', orderId, restaurantId: orderId });
      expect(route).toBe('/commandes');
      expect(pushRoute({ type: 'new_menu', restaurantId: orderId })).toBe('/restaurants');
    },
  );

  it('always returns an internal path', () => {
    for (const type of ['order_update', 'new_menu', 'loyalty_earned', 'zzz']) {
      const route = pushRoute({ type, orderId: 'o1', restaurantId: 'r1' });
      expect(route.startsWith('/')).toBe(true);
      expect(route.startsWith('//')).toBe(false);
    }
  });
});
