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
 * `FileTypeValidator` sur jpeg/jpg/png/webp, dossier imposé.
 */
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

/** Dossiers Cloudinary acceptés par le backend (`CloudinaryFolder`). */
export type UploadFolder = 'restaurants' | 'products' | 'menus' | 'users' | 'banners';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo — aligné sur MaxFileSizeValidator backend

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
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('Format non supporté : utilisez JPG, PNG ou WebP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde : 5 Mo maximum.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/upload/image?folder=${folder}`, {
    method: 'POST',
    // Pas de Content-Type manuel : le navigateur pose lui-même la boundary
    // multipart.
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      detail = json.message ?? json.error ?? '';
    } catch {
      detail = await res.text().catch(() => '');
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
