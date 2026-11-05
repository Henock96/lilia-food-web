import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoyaltyToggle } from '../components/checkout/loyalty-toggle';

afterEach(() => vi.unstubAllGlobals());

const render = (props: Partial<React.ComponentProps<typeof LoyaltyToggle>> = {}) => {
  vi.stubGlobal('React', React);
  return renderToStaticMarkup(
    React.createElement(LoyaltyToggle, {
      points: 200,
      pointValueXaf: 50,
      active: false,
      discountXaf: null,
      pointsUsed: null,
      onToggle: vi.fn(),
      ...props,
    }),
  );
};

/** `formatCurrency` sépare les milliers par une espace insécable. */
const text = (html: string) => html.replace(/[  ]/g, ' ');

describe('LoyaltyToggle', () => {
  it('est un interrupteur nommé, dans son état', () => {
    const html = render({ active: true });
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Utiliser mes points fidélité"');
  });

  it('inactif : la valeur d’un point, pas le solde converti en réduction', () => {
    const html = text(render());
    expect(html).toContain('200 points disponibles');
    expect(html).toContain('1 point = 50');
    expect(html).not.toContain('10 000');
  });

  it('actif : la réduction du devis, celle que le serveur accorde', () => {
    const html = text(render({ active: true, discountXaf: 3000, pointsUsed: 60 }));
    expect(html).toContain('60 points utilisés');
    expect(html).toContain('3 000');
    expect(html).not.toContain('10 000');
  });

  it('actif sans devis : aucun montant inventé', () => {
    const html = text(render({ active: true }));
    expect(html).toContain('Réduction calculée au récapitulatif');
    expect(html).not.toContain('10 000');
  });
});
