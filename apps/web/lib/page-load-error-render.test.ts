import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageLoadError } from '../components/ui/page-load-error';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/actions/vendors', () => ({ revalidateVendorMenu: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe('PageLoadError', () => {
  it('dit la panne, propose de réessayer, et ne parle pas d’une page introuvable', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(
      React.createElement(PageLoadError, { title: 'Impossible de charger ce vendeur.' }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Impossible de charger ce vendeur.');
    expect(html).toContain('Réessayer');
    expect(html).not.toContain('introuvable');
  });
});
