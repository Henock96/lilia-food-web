import { describe, expect, it } from 'vitest';

import { moderationActionPath, moderationListPath } from './reviews';

/** Lot B — chemins exacts des routes de modération du backend. */
describe('modération des avis — chemins', () => {
  it.each([
    ['REVIEW', 'hide', '/admin/review-moderation/reviews/r1/hide'],
    ['REVIEW', 'unhide', '/admin/review-moderation/reviews/r1/unhide'],
    ['VENDOR_REPLY', 'hide', '/admin/review-moderation/reviews/r1/reply/hide'],
    ['VENDOR_REPLY', 'unhide', '/admin/review-moderation/reviews/r1/reply/unhide'],
    ['DELIVERY_REVIEW', 'hide', '/admin/review-moderation/delivery-reviews/r1/hide'],
  ] as const)('%s %s', (target, action, expected) => {
    expect(moderationActionPath(target, 'r1', action)).toBe(expected);
  });

  it('l’identifiant est encodé', () => {
    expect(moderationActionPath('REVIEW', 'a/b', 'hide')).toBe(
      '/admin/review-moderation/reviews/a%2Fb/hide',
    );
  });

  it('liste : filtres seulement quand ils filtrent', () => {
    expect(moderationListPath('reviews', {}, 1)).toBe(
      '/admin/review-moderation/reviews?page=1&limit=20',
    );
    expect(
      moderationListPath('delivery-reviews', { rating: 1, visibility: 'hidden' }, 3),
    ).toBe('/admin/review-moderation/delivery-reviews?page=3&limit=20&rating=1&visibility=hidden');
    expect(moderationListPath('reviews', { visibility: 'all' }, 1)).not.toContain('visibility');
  });
});
