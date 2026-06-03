/**
 * Upload direct vers Cloudinary via unsigned preset. Pas de secret côté
 * client — `upload_preset` et `cloud_name` sont publics. Capture le
 * `public_id` retourné par Cloudinary pour permettre le cleanup backend
 * au DELETE.
 *
 * ⚠️ Preset unsigned = quiconque connaît cloud_name + preset peut uploader.
 * La validation ci-dessous (type + taille) limite les abus côté client, mais
 * la VRAIE barrière doit être configurée sur le preset Cloudinary (W6, ops) :
 * formats autorisés (jpg/png/webp), `max_file_size`, dossier imposé,
 * transformation entrante. Voir Cloudinary Console → Upload presets.
 */
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary env vars manquantes : NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
    );
  }

  // Garde-fou client (W6) — défense en profondeur en plus des restrictions
  // du preset Cloudinary côté serveur.
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('Format non supporté : utilisez JPG, PNG ou WebP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde : 5 Mo maximum.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { secure_url: string; public_id: string };
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}
