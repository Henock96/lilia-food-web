import type { ImageLoaderProps } from 'next/image';

const CLOUDINARY_IMAGE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** Premier segment de transformations : `w_400`, `f_auto,q_auto`… */
const TRANSFORMED = /^[a-z]{1,3}_[^/]*\//;

/**
 * Fait redimensionner les images de vendeurs par Cloudinary.
 *
 * Ces URL sont arbitraires (Cloudinary ou lien tiers), d'où `unoptimized` sur
 * les cartes : un logo de 298 Ko partait donc entier pour une centaine de
 * pixels affichés, sur la 4G de Brazzaville. Un `loader` règle les deux : pas
 * de proxy `/_next/image`, et `next/image` choisit la largeur selon `sizes`.
 * Une URL qui n'est pas une image Cloudinary reste intacte.
 */
export function cloudinaryLoader({ src, width }: Pick<ImageLoaderProps, 'src' | 'width'>): string {
  const match = CLOUDINARY_IMAGE.exec(src);
  if (!match) return src;
  const [, base, path] = match;
  if (TRANSFORMED.test(path)) return src;
  return `${base}f_auto,q_auto,c_limit,w_${width}/${path}`;
}
