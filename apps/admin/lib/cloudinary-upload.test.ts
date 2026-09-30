import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_ACCEPT, isAcceptedImage, uploadToCloudinary } from './cloudinary-upload';

/**
 * Envoi d'image de l'Admin Web.
 *
 * Deux défauts corrigés :
 * 1. les photos d'iPhone (HEIC/HEIF) étaient refusées avant même l'envoi — et
 *    arrivent souvent SANS type hors de Safari ;
 * 2. plusieurs photos choisies d'un coup partaient en rafale : la seconde
 *    prenait un 429 (1 envoi/s par compte côté serveur), avalé en
 *    « 1 image(s) non uploadée(s) ».
 */
const file = (name: string, type: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type });

describe('isAcceptedImage', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['logo.png', 'image/png'],
    ['a.webp', 'image/webp'],
    ['IMG_0001.HEIC', 'image/heic'],
    ['IMG_0002.heif', 'image/heif'],
    // Chrome / Firefox : type inconnu pour un HEIC.
    ['IMG_0003.HEIC', ''],
    ['IMG_0004.heic', 'application/octet-stream'],
  ])('%s (%s) accepté', (name, type) => {
    expect(isAcceptedImage({ name, type })).toBe(true);
  });

  it.each([
    ['anim.gif', 'image/gif'],
    ['vecteur.svg', 'image/svg+xml'],
    ['page.html', 'text/html'],
    // Un type connu et faux ne se rattrape pas par l'extension.
    ['piege.heic', 'text/html'],
    ['sans-extension', ''],
  ])('%s (%s) refusé', (name, type) => {
    expect(isAcceptedImage({ name, type })).toBe(false);
  });

  it('le sélecteur propose les extensions HEIC/HEIF', () => {
    expect(IMAGE_ACCEPT).toContain('.heic');
    expect(IMAGE_ACCEPT).toContain('image/heif');
  });
});

describe('uploadToCloudinary', () => {
  const ok = () =>
    new Response(JSON.stringify({ data: { url: 'https://cdn/x.jpg', publicId: 'x' } }), {
      status: 201,
    });
  const status = (code: number, body: unknown = { message: 'refus' }) =>
    new Response(JSON.stringify(body), { status: code });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('un HEIC sans type part bien au serveur', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadToCloudinary(file('IMG.HEIC', ''), 'tok')).resolves.toEqual({
      secureUrl: 'https://cdn/x.jpg',
      publicId: 'x',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429 puis 201 : rejoué après une pause, réussit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const pending = uploadToCloudinary(file('a.jpg', 'image/jpeg'), 'tok');
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ publicId: 'x' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('429 persistant : message clair après les nouveaux essais', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => status(429));
    vi.stubGlobal('fetch', fetchMock);
    const pending = uploadToCloudinary(file('a.jpg', 'image/jpeg'), 'tok');
    const assertion = expect(pending).rejects.toThrow(/Trop d’envois/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('400 : jamais rejoué, motif du serveur remonté', async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(400, { message: 'type refusé' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadToCloudinary(file('a.jpg', 'image/jpeg'), 'tok')).rejects.toThrow(
      /400.*type refusé/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('format refusé côté client : rien n’est envoyé', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadToCloudinary(file('a.gif', 'image/gif'), 'tok')).rejects.toThrow(
      /HEIC/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
