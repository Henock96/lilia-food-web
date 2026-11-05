import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../components/ui/confirm-dialog';

afterEach(() => vi.unstubAllGlobals());

const render = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  vi.stubGlobal('React', React);
  return renderToStaticMarkup(
    React.createElement(ConfirmDialog, {
      open: true,
      title: 'Annuler cette commande ?',
      confirmLabel: 'Annuler la commande',
      cancelLabel: 'Garder ma commande',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      ...props,
    }),
  );
};

describe('ConfirmDialog', () => {
  it('fermé : rien', () => {
    expect(render({ open: false })).toBe('');
  });

  it('ouvert : alerte modale titrée, avec ses deux gestes', () => {
    const html = render();
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('Annuler cette commande ?');
    expect(html).toContain('Garder ma commande');
  });

  it('le focus va au geste sans conséquence', () => {
    const html = render();
    expect(html.indexOf('data-autofocus')).toBeGreaterThan(-1);
    expect(html.indexOf('data-autofocus')).toBeLessThan(html.indexOf('Garder ma commande'));
  });

  it('pendant l’envoi : les deux gestes sont désactivés', () => {
    const html = render({ pending: true });
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
