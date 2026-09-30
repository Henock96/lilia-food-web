import { API_URL } from '@lilia/api-client';

/**
 * Upload d'image via le backend (`POST /upload/image`), authentifié par le
 * token Firebase de l'admin connecté.
 *
 * Historiquement cet upload partait en direct vers Cloudinary avec un preset
 * *unsigned* : `cloud_name` et `upload_preset` vivaient dans des variables
 * `NEXT_PUBLIC_*`, donc lisibles dans le bundle JS. N'importe qui pouvait donc
 * uploader des fichiers arbitraires sur le compte Cloudinary de Lilia — abus de
 * facturation et hébergement de contenu illicite sous le domaine du projet
 * (audit 2026-08-01, E-5).
 *
 * Le backend applique les mêmes garanties que pour `apps/web`, mais côté
 * serveur où elles ne peuvent pas être contournées : authentification, 5 Mo max,
 * `FileTypeValidator` sur jpeg/png/webp/heic/heif (lu dans le contenu), dossier
 * imposé. Un HEIC est converti en JPG par le serveur.
 */
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

/** Dossiers Cloudinary acceptés par le backend (`CloudinaryFolder`). */
export type UploadFolder = 'restaurants' | 'products' | 'menus' | 'users' | 'banners';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo — aligné sur MaxFileSizeValidator backend

/**
 * Valeur de l'attribut `accept` des sélecteurs de fichier. Les extensions
 * sont listées en plus des types : pour un HEIC, Chrome et Firefox ne
 * connaissent souvent pas le type, et le filtrent sur l'extension.
 */
export const IMAGE_ACCEPT = [...ALLOWED_MIME, '.heic', '.heif'].join(',');

/**
 * Le fichier a-t-il une chance d'être accepté par le serveur ?
 *
 * Les photos d'iPhone (HEIC/HEIF) arrivent souvent SANS type (`file.type`
 * vide) hors de Safari : on se rabat alors sur l'extension. Ce n'est qu'un
 * tri côté client — le serveur lit le contenu réel du fichier.
 */
export function isAcceptedImage(file: Pick<File, 'type' | 'name'>): boolean {
  if (ALLOWED_MIME.includes(file.type)) return true;
  if (file.type && file.type !== 'application/octet-stream') return false;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Le serveur limite l'envoi à 1 image par seconde par compte. Plusieurs
 * photos choisies d'un coup partent l'une après l'autre : la seconde prenait
 * un 429 dès que la première était rapide. On attend, puis on rejoue.
 */
const THROTTLE_RETRIES = 2;
const THROTTLE_WAIT_MS = 1200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadToCloudinary(
  file: File,
  token: string,
  folder: UploadFolder = 'products',
): Promise<CloudinaryUploadResult> {
  if (!token) {
    throw new Error('Session expirée : reconnectez-vous pour envoyer une image.');
  }

  // Garde-fou client : évite un aller-retour réseau inutile. La vraie barrière
  // est côté backend.
  if (!isAcceptedImage(file)) {
    throw new Error('Format non supporté : utilisez JPG, PNG, WebP ou HEIC (photo d’iPhone).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde : 5 Mo maximum.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const send = () =>
    fetch(`${API_URL}/upload/image?folder=${folder}`, {
      method: 'POST',
      // Pas de Content-Type manuel : le navigateur pose lui-même la boundary
      // multipart.
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

  let res = await send();
  for (let attempt = 0; res.status === 429 && attempt < THROTTLE_RETRIES; attempt++) {
    await sleep(THROTTLE_WAIT_MS * (attempt + 1));
    res = await send();
  }

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      detail = json.message ?? json.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    if (res.status === 429) {
      throw new Error('Trop d’envois d’images à la suite : patientez une minute puis réessayez.');
    }
    throw new Error(`Upload échoué (${res.status})${detail ? ': ' + detail : ''}`);
  }

  // L'ApiResponseInterceptor du backend enveloppe la réponse en `{ data: ... }`.
  // On reste tolérant aux deux formes le temps de la migration api-contract-v2.
  const json = await res.json();
  const payload = (json?.data ?? json) as { url: string; publicId: string };

  if (!payload?.url || !payload?.publicId) {
    throw new Error('Réponse inattendue du serveur lors de l’upload.');
  }

  return { secureUrl: payload.url, publicId: payload.publicId };
}
