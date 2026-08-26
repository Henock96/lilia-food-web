import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHeroMode } from './hero-mode';

const { fetchImageWidth } = vi.hoisted(() => ({ fetchImageWidth: vi.fn() }));

vi.mock('./image-size', async () => {
  const actual = await vi.importActual<typeof import('./image-size')>('./image-size');
  return { ...actual, fetchImageWidth };
});

describe('getHeroMode', () => {
  beforeEach(() => {
    fetchImageWidth.mockReset();
  });

  it('bascule sur l’aplat quand aucun slide n’a d’image (0 vendeur éligible)', async () => {
    await expect(getHeroMode(undefined)).resolves.toBe('flat');
    expect(fetchImageWidth).not.toHaveBeenCalled();
  });

  it('choisit la photo quand la largeur atteint le seuil', async () => {
    fetchImageWidth.mockResolvedValue(1600);
    await expect(getHeroMode('https://res.cloudinary.com/x/big.jpg')).resolves.toBe('photo');
  });

  it('choisit la photo pile au seuil (borne inclusive)', async () => {
    fetchImageWidth.mockResolvedValue(1200);
    await expect(getHeroMode('https://res.cloudinary.com/x/exact.jpg')).resolves.toBe('photo');
  });

  it('bascule sur l’aplat sous le seuil — cas réel des deux photos vendeur actuelles', async () => {
    fetchImageWidth.mockResolvedValue(259);
    await expect(getHeroMode('https://res.cloudinary.com/x/thumb.jpg')).resolves.toBe('flat');
  });

  it('bascule sur l’aplat quand la largeur est inconnue (le doute profite à l’aplat)', async () => {
    fetchImageWidth.mockResolvedValue(null);
    await expect(getHeroMode('https://un-hote.example/photo.jpg')).resolves.toBe('flat');
  });
});
