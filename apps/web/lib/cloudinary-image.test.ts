import { describe, expect, it } from 'vitest';
import { cloudinaryLoader } from './cloudinary-image';

const BASE = 'https://res.cloudinary.com/dun9ev7pw/image/upload';

describe('cloudinaryLoader', () => {
  it('demande à Cloudinary le format et la largeur voulus', () => {
    expect(
      cloudinaryLoader({ src: `${BASE}/v1792/lilia-food/restaurants/a.png`, width: 256 }),
    ).toBe(`${BASE}/f_auto,q_auto,c_limit,w_256/v1792/lilia-food/restaurants/a.png`);
  });

  it('gère une image sans numéro de version', () => {
    expect(cloudinaryLoader({ src: `${BASE}/lilia-food/a.png`, width: 128 })).toBe(
      `${BASE}/f_auto,q_auto,c_limit,w_128/lilia-food/a.png`,
    );
  });

  it('ne double pas une transformation déjà présente', () => {
    const src = `${BASE}/w_400,c_fill/v1792/a.png`;
    expect(cloudinaryLoader({ src, width: 256 })).toBe(src);
  });

  it('laisse intacte une image hébergée ailleurs', () => {
    const src = 'https://sogood.paris/photo.jpg';
    expect(cloudinaryLoader({ src, width: 256 })).toBe(src);
  });

  it('laisse intacte une vidéo Cloudinary', () => {
    const src = 'https://res.cloudinary.com/dun9ev7pw/video/upload/v1/a.mp4';
    expect(cloudinaryLoader({ src, width: 256 })).toBe(src);
  });

  it('laisse intacte une image locale', () => {
    expect(cloudinaryLoader({ src: '/placeholder.png', width: 256 })).toBe('/placeholder.png');
  });
});
