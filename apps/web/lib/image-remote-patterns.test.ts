import { describe, expect, it } from 'vitest';
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern';
import { imageRemotePatterns } from './image-remote-patterns';

/** Ce que décide `/_next/image` : Next appelle cette même fonction. */
function optimise(url: string): boolean {
  return hasRemoteMatch([], imageRemotePatterns(), new URL(url));
}

const LILIA = 'https://res.cloudinary.com/dun9ev7pw/image/upload';

describe('imageRemotePatterns', () => {
  it('optimise les images du compte Cloudinary de Lilia', () => {
    expect(optimise(`${LILIA}/v1788535326/lilia-food/users/bletnvhsw2itcqvk4go3.jpg`)).toBe(true);
  });

  it('refuse les images d’un autre compte Cloudinary', () => {
    expect(optimise('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(false);
  });

  it('refuse la récupération d’images tierces par le compte de Lilia', () => {
    expect(
      optimise('https://res.cloudinary.com/dun9ev7pw/image/fetch/https://evil.example/a.jpg'),
    ).toBe(false);
  });

  it('refuse un compte Cloudinary au nom voisin', () => {
    expect(optimise('https://res.cloudinary.com/dun9ev7pw-evil/image/upload/a.jpg')).toBe(false);
  });

  it.each([
    'https://sogood.paris/photo.jpg',
    'https://kelianfood.com/photo.jpg',
    'https://static.750g.com/photo.jpg',
    'https://upload.wikimedia.org/photo.jpg',
    'https://www.magasin-stalingrad.com/photo.jpg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn',
  ])('refuse l’ancien hôte tiers %s', (url) => {
    expect(optimise(url)).toBe(false);
  });

  it('refuse le http', () => {
    expect(optimise(`http://res.cloudinary.com/dun9ev7pw/image/upload/a.jpg`)).toBe(false);
  });

  it('garde les avatars Google et Firebase Storage', () => {
    expect(optimise('https://lh3.googleusercontent.com/a/ACg8ocK=s96-c')).toBe(true);
    expect(optimise('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg')).toBe(true);
  });
});
