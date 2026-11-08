import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CustomerInstructions, OrderCardIdentity } from '../components/orders/order-card-parts';

const identity = (vendorName: string | null) =>
  renderToStaticMarkup(
    React.createElement(OrderCardIdentity, {
      vendorName,
      orderId: 'cmabcdef0123456789',
      createdAt: '2026-11-07T18:42:00Z',
    }),
  );

describe('carte de commande — à qui est-elle, que demande le client', () => {
  it('nomme le vendeur avant le numéro de commande', () => {
    const html = identity('Dynasty');
    expect(html).toContain('Dynasty');
    expect(html.indexOf('Dynasty')).toBeLessThan(html.indexOf('#23456789'));
  });

  it('sans vendeur connu, le numéro reste affiché', () => {
    expect(identity(null)).toContain('#23456789');
  });

  it('affiche les instructions du client en clair, titre compris', () => {
    const html = renderToStaticMarkup(
      React.createElement(CustomerInstructions, { notes: 'Sans piment, sauce à part' }),
    );
    expect(html).toContain('Instructions du client');
    expect(html).toContain('Sans piment, sauce à part');
    expect(html).toContain('text-sm');
    expect(html).not.toContain('italic');
  });

  it.each([null, '', '   '])('rien quand il n’y a pas d’instruction (%j)', (notes) => {
    expect(renderToStaticMarkup(React.createElement(CustomerInstructions, { notes }))).toBe('');
  });
});
