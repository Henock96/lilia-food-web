import { describe, expect, it } from 'vitest';
import { readPushMessage } from './push-browser';

describe('readPushMessage', () => {
  it('reads a foreground notification', () => {
    expect(readPushMessage({ source: 'lilia-push', title: 'T', body: 'B', data: { type: 'new_order', orderId: 'o1' } }))
      .toEqual({ source: 'lilia-push', title: 'T', body: 'B', data: { type: 'new_order', orderId: 'o1' } });
  });

  it('reads a click relayed to an open tab', () => {
    expect(readPushMessage({ source: 'lilia-push-open', data: { type: 'incident' } }))
      .toEqual({ source: 'lilia-push-open', data: { type: 'incident' } });
  });

  it('drops non-string data values', () => {
    expect(readPushMessage({ source: 'lilia-push-open', data: { a: 1, b: 'x', c: { d: 'e' } } }))
      .toEqual({ source: 'lilia-push-open', data: { b: 'x' } });
  });

  it.each([null, undefined, 'x', {}, { source: 'other' }, { source: 'lilia-push' }])(
    'ignores foreign messages (%j)',
    (value) => {
      expect(readPushMessage(value)).toBeNull();
    },
  );
});
