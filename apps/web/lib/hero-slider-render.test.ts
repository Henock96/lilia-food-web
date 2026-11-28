import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { HeroSlider } from '../components/home/hero-slider';

const { setSelectedIndex } = vi.hoisted(() => ({ setSelectedIndex: vi.fn() }));

vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof React>();
  return {
    ...react,
    useState: (initial: number | boolean) =>
      initial === 0 ? [3, setSelectedIndex] : react.useState(initial),
  };
});

vi.mock('framer-motion', () => ({ useReducedMotion: () => true }));

it('affiche uniquement les bannières configurées, même si la sélection a été retirée', () => {
  vi.stubGlobal('React', React);
  try {
    const html = renderToStaticMarkup(React.createElement(HeroSlider, { slides: [] }));
    expect(html).not.toContain('<img');
    const banner = {
      id: 'configured',
      imageUrl: '/banner.jpg',
      title: '',
      description: '',
      linkUrl: '/restaurants',
      displayOrder: 0,
    };
    const withBanner = renderToStaticMarkup(React.createElement(HeroSlider, { slides: [banner] }));
    expect(withBanner).toContain('banner.jpg');
    expect(withBanner).not.toContain('cat1.jpeg');
    expect(setSelectedIndex).toHaveBeenCalledWith(0);
  } finally {
    vi.unstubAllGlobals();
  }
});
