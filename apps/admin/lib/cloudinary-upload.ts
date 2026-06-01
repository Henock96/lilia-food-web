/**
 * Upload direct vers Cloudinary via unsigned preset. Pas de secret côté
 * client — `upload_preset` et `cloud_name` sont publics. Capture le
 * `public_id` retourné par Cloudinary pour permettre le cleanup backend
 * au DELETE.
 */
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary env vars manquantes : NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
    );
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
