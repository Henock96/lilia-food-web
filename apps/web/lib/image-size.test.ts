import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseJpegSize,
  parsePngSize,
  parseWebpSize,
  parseImageSize,
  fetchImageWidth,
  HERO_MIN_WIDTH,
} from './image-size';

// ─────────────────────────── Fixtures JPEG ───────────────────────────

function buildSOF0(width: number, height: number): number[] {
  return [
    0xff,
    0xc0, // SOF0
    0x00,
    0x11, // longueur = 17 (s'inclut elle-même)
    0x08, // précision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // 3 composants
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ];
}

/** SOI + SOF0 minimal, fabriqué à la main : un en-tête JPEG baseline valide. */
const VALID_SOF0 = new Uint8Array([0xff, 0xd8, ...buildSOF0(300, 200)]);

/** SOI + APP0 (segment ignoré, à sauter) + SOF0. */
const SOF0_AFTER_APP0 = new Uint8Array([
  0xff,
  0xd8, // SOI
  0xff,
  0xe0, // APP0
  0x00,
  0x10, // longueur = 16
  ...new Array(14).fill(0),
  ...buildSOF0(200, 100),
]);

/**
 * Construit un JPEG dont le marqueur SOF0 se trouve après `paddingLength`
 * octets d'un segment APP1 factice (simule un gros bloc EXIF/ICC comme en
 * portent les vraies photos d'appareil) — de quoi vérifier qu'une fenêtre
 * de lecture de 64 Ko trouve bien des dimensions au-delà de 4 Ko.
 */
function buildJpegWithPadding(paddingLength: number, width: number, height: number): Uint8Array {
  const app1 = [0xff, 0xe1, (paddingLength >> 8) & 0xff, paddingLength & 0xff];
  for (let i = 0; i < paddingLength - 2; i++) app1.push(0x00);
  return new Uint8Array([0xff, 0xd8, ...app1, ...buildSOF0(width, height)]);
}

describe('parseJpegSize', () => {
  it('lit les dimensions d’un en-tête JPEG valide', () => {
    expect(parseJpegSize(VALID_SOF0)).toEqual({ width: 300, height: 200 });
  });

  it('traverse les segments non-SOF (ex. APP0) avant de trouver SOF0', () => {
    expect(parseJpegSize(SOF0_AFTER_APP0)).toEqual({ width: 200, height: 100 });
  });

  it('trouve un SOF0 placé après 4 Ko de préambule (bloc EXIF/ICC volumineux)', () => {
    const jpeg = buildJpegWithPadding(6000, 1920, 1080);
    // Le marqueur SOF0 démarre après SOI(2) + marqueur APP1(2) + longueur(6000).
    expect(jpeg.length).toBeGreaterThan(4096);
    expect(parseJpegSize(jpeg)).toEqual({ width: 1920, height: 1080 });
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

  it('traverse un marqueur RSTn autonome (0xD0–0xD7) avant SOF0', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd3, ...buildSOF0(640, 480)]);
    expect(parseJpegSize(jpeg)).toEqual({ width: 640, height: 480 });
  });

  it('traverse un marqueur TEM autonome (0x01) avant SOF0', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x01, ...buildSOF0(640, 480)]);
    expect(parseJpegSize(jpeg)).toEqual({ width: 640, height: 480 });
  });

  it('tolère des octets de bourrage 0xFF avant un marqueur réel', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xff, 0xc0, ...buildSOF0(640, 480).slice(2)]);
    expect(parseJpegSize(jpeg)).toEqual({ width: 640, height: 480 });
  });

  it('ne boucle pas et ne lit pas hors limites sur un buffer de pur bourrage 0xFF', () => {
    const allPadding = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(() => parseJpegSize(allPadding)).not.toThrow();
    expect(parseJpegSize(allPadding)).toBeNull();
  });
});

// ─────────────────────────── Fixtures PNG ───────────────────────────

function buildPng(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // signature
    0x00,
    0x00,
    0x00,
    0x0d, // longueur du chunk IHDR = 13
    0x49,
    0x48,
    0x44,
    0x52, // "IHDR"
    (width >> 24) & 0xff,
    (width >> 16) & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    (height >> 24) & 0xff,
    (height >> 16) & 0xff,
    (height >> 8) & 0xff,
    height & 0xff,
  ]);
}

describe('parsePngSize', () => {
  it('lit les dimensions du chunk IHDR', () => {
    expect(parsePngSize(buildPng(2000, 1333))).toEqual({ width: 2000, height: 1333 });
  });

  it('rend null pour une signature invalide', () => {
    expect(parsePngSize(new Uint8Array(24))).toBeNull();
  });

  it('rend null pour un buffer tronqué', () => {
    expect(parsePngSize(buildPng(2000, 1333).slice(0, 15))).toBeNull();
  });
});

// ─────────────────────────── Fixtures WebP ───────────────────────────

function u16LE(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}

function u24LE(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
}

function u32LE(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

function buildWebp(fourCC: string, data: number[]): Uint8Array {
  const fourCCBytes = [...fourCC].map((c) => c.charCodeAt(0));
  const body = [...fourCCBytes, ...u32LE(data.length), ...data];
  const riffSize = 4 + body.length; // "WEBP" + chunks, sans le champ taille lui-même
  return new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    ...u32LE(riffSize),
    0x57,
    0x45,
    0x42,
    0x50, // "WEBP"
    ...body,
  ]);
}

function buildWebpVP8(width: number, height: number): Uint8Array {
  const data = [
    0x10,
    0x00,
    0x00, // tag de trame (contenu arbitraire, non lu par le parseur)
    0x9d,
    0x01,
    0x2a, // code de démarrage VP8
    ...u16LE(width & 0x3fff),
    ...u16LE(height & 0x3fff),
  ];
  return buildWebp('VP8 ', data);
}

function buildWebpVP8L(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  const data = [0x2f, ...u32LE(bits)];
  return buildWebp('VP8L', data);
}

function buildWebpVP8X(width: number, height: number): Uint8Array {
  const data = [0x00, 0, 0, 0, ...u24LE(width - 1), ...u24LE(height - 1)];
  return buildWebp('VP8X', data);
}

describe('parseWebpSize', () => {
  it('lit les dimensions d’un WebP lossy (VP8 )', () => {
    expect(parseWebpSize(buildWebpVP8(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('lit les dimensions d’un WebP lossless (VP8L)', () => {
    expect(parseWebpSize(buildWebpVP8L(1600, 900))).toEqual({ width: 1600, height: 900 });
  });

  it('lit les dimensions d’un WebP étendu (VP8X)', () => {
    expect(parseWebpSize(buildWebpVP8X(2500, 1400))).toEqual({ width: 2500, height: 1400 });
  });

  it('rend null pour un conteneur RIFF non-WebP', () => {
    const notWebp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20, // "AVI "
    ]);
    expect(parseWebpSize(notWebp)).toBeNull();
  });

  it('rend null pour un chunk WebP inconnu', () => {
    expect(parseWebpSize(buildWebp('ANIM', [0, 0, 0, 0]))).toBeNull();
  });

  it('rend null pour un buffer tronqué', () => {
    expect(parseWebpSize(buildWebpVP8(1920, 1080).slice(0, 15))).toBeNull();
  });
});

// ─────────────────────────── parseImageSize (dispatch) ───────────────────────────

describe('parseImageSize', () => {
  it('détecte et parse un JPEG', () => {
    expect(parseImageSize(VALID_SOF0)).toEqual({ width: 300, height: 200 });
  });

  it('détecte et parse un PNG', () => {
    expect(parseImageSize(buildPng(2000, 1333))).toEqual({ width: 2000, height: 1333 });
  });

  it('détecte et parse un WebP', () => {
    expect(parseImageSize(buildWebpVP8(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('rend null pour un format inconnu', () => {
    expect(parseImageSize(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });
});

// ─────────────────────────── fetchImageWidth ───────────────────────────

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

  it('demande une fenêtre de 64 Ko (65536 octets) via Range', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 206,
      arrayBuffer: async () => VALID_SOF0.buffer,
    });
    vi.stubGlobal('fetch', fetchMock);
    await fetchImageWidth('https://example.test/photo.jpg');
    const [, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(options.headers.Range).toBe('bytes=0-65535');
  });

  it('trouve une largeur même quand le SOF est au-delà de 4 Ko', async () => {
    const jpeg = buildJpegWithPadding(6000, 1920, 1080);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 206, arrayBuffer: async () => jpeg.buffer }),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBe(1920);
  });

  it('passe un AbortSignal avec un timeout aux options de fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 206,
      arrayBuffer: async () => VALID_SOF0.buffer,
    });
    vi.stubGlobal('fetch', fetchMock);
    await fetchImageWidth('https://example.test/photo.jpg');
    const [, options] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('rend null quand la requête est abandonnée pour timeout (AbortError), sans lever', async () => {
    // Simule ce que produit `AbortSignal.timeout` une fois expiré, sans
    // attendre le vrai délai ni mocker les timers globaux.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
  });

  it('rend null si le serveur ignore Range et répond 200, et draine le corps', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        body: { cancel },
        arrayBuffer: async () => VALID_SOF0.buffer,
      }),
    );
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('rend null en cas d’échec réseau, sans lever', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(fetchImageWidth('https://example.test/photo.jpg')).resolves.toBeNull();
  });

  it('rend null quand le corps n’est pas une image reconnaissable', async () => {
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
