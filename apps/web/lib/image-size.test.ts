import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseJpegSize, fetchImageWidth, HERO_MIN_WIDTH } from './image-size';

/**
 * SOI + SOF0 minimal, fabriqué à la main : 300×200, précision 8 bits, 3
 * composants (Y/Cb/Cr) — un en-tête JPEG baseline valide et complet.
 */
const VALID_SOF0 = new Uint8Array([
  0xff, 0xd8, // SOI
  0xff, 0xc0, // SOF0
  0x00, 0x11, // longueur du segment = 17 (s'inclut elle-même)
  0x08, // précision
  0x00, 0xc8, // hauteur = 200
  0x01, 0x2c, // largeur = 300
  0x03, // 3 composants
  0x01, 0x22, 0x00,
  0x02, 0x11, 0x01,
  0x03, 0x11, 0x01,
]);

/**
 * SOI + APP0 (segment ignoré, à sauter) + SOF0 : vérifie que le parseur
 * traverse bien les segments non-SOF avant de trouver les dimensions,
 * comme un vrai fichier JFIF (APP0 précède toujours SOF0 en pratique).
 */
const SOF0_AFTER_APP0 = new Uint8Array([
  0xff, 0xd8, // SOI
  0xff, 0xe0, // APP0
  0x00, 0x10, // longueur = 16
  ...new Array(14).fill(0), // contenu APP0, peu importe
  0xff, 0xc0, // SOF0
  0x00, 0x11,
  0x08,
  0x00, 0x64, // hauteur = 100
  0x00, 0xc8, // largeur = 200
  0x03,
  0x01, 0x22, 0x00,
  0x02, 0x11, 0x01,
  0x03, 0x11, 0x01,
]);

describe('parseJpegSize', () => {
  it('lit les dimensions d’un en-tête JPEG valide', () => {
    expect(parseJpegSize(VALID_SOF0)).toEqual({ width: 300, height: 200 });
  });

  it('traverse les segments non-SOF (ex. APP0) avant de trouver SOF0', () => {
    expect(parseJpegSize(SOF0_AFTER_APP0)).toEqual({ width: 200, height: 100 });
  });

  it('rend null pour un buffer tronqué avant les dimensions', () => {
    expect(parseJpegSize(VALID_SOF0.slice(0, 10))).toBeNull();
  });

  it('rend null pour un buffer vide', () => {
    expect(parseJpegSize(new Uint8Array())).toBeNull();
  });

  it('rend null pour des octets qui ne sont pas du JPEG', () => {
    expect(parseJpegSize(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]))).toBeNull();
  });

  it('rend null pour un PNG (mauvaise signature)', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(parseJpegSize(png)).toBeNull();
  });

  it('ne lève jamais, même sur un marqueur corrompu en cours de segment', () => {
    const corrupt = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xaa, 0xbb]);
    expect(() => parseJpegSize(corrupt)).not.toThrow();
    expect(parseJpegSize(corrupt)).toBeNull();
  });
});

describe('fetchImageWidth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rend la largeur quand le serveur répond 206 avec un JPEG valide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 206,
        arrayBuffer: async () => VALID_SOF0.buffer,
      }),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBe(300);
  });

  it('rend null si le serveur ignore Range et répond 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        arrayBuffer: async () => VALID_SOF0.buffer,
      }),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
  });

  it('rend null en cas d’échec réseau, sans lever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
  });

  it('rend null quand le corps n’est pas un JPEG reconnaissable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 206,
        arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer,
      }),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
  });
});

describe('HERO_MIN_WIDTH', () => {
  it('vaut 1200px', () => {
    expect(HERO_MIN_WIDTH).toBe(1200);
  });
});
