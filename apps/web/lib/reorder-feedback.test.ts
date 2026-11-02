import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReorderResult } from '@lilia/api-client';
import { ReorderNotice } from '../components/orders/reorder-notice';
import { reorderFeedback } from './reorder-feedback';

afterEach(() => vi.unstubAllGlobals());
function result(added: number, unavailable: number, errors: number): ReorderResult {
  return { summary: { totalAdded: added, totalUnavailable: unavailable, totalErrors: errors }, details: {
    added: Array.from({ length: added }, () => ({})),
    unavailable: Array.from({ length: unavailable }, () => ({ productName: 'Jus', reason: 'Format épuisé' })),
    errors: Array.from({ length: errors }, () => ({})),
  } };
}
describe('honest reorder feedback', () => {
  it('navigates only when all reported lines were added', () => {
    expect(reorderFeedback(result(2, 0, 0))).toMatchObject({ kind: 'complete', navigate: true });
  });
  it.each([[1, 1, 0], [1, 0, 1]])('keeps a partial result visible (%s/%s/%s)', (a, u, e) => {
    expect(reorderFeedback(result(a, u, e))).toMatchObject({ kind: 'partial', navigate: false });
  });
  it.each([[0, 2, 0], [0, 0, 1], [0, 0, 0]])('never announces an addition when nothing was added (%s/%s/%s)', (a, u, e) => {
    expect(reorderFeedback(result(a, u, e))).toEqual({ kind: 'none', navigate: false, message: 'Aucun article n’a été ajouté au panier.' });
  });
  it('renders unavailable items, errors and a cart link for the partial result', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(React.createElement(ReorderNotice, { result: result(1, 1, 1) }));
    expect(html).toContain('Réachat partiel');
    expect(html).toContain('Jus : Format épuisé');
    expect(html).toContain('L’ajout de cet article a échoué.');
    expect(html).toContain('href="/panier"');
    expect(html).toContain('role="status"');
  });
});
