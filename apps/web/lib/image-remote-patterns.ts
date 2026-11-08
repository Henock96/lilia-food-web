import type { NextConfig } from 'next';

type RemotePatterns = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>;

/**
 * Hôtes dont `/_next/image` accepte d'optimiser les images, servis par
 * `next.config.ts`.
 *
 * Allowlist strict — bloque l'open proxy d'optimisation next/image
 * (DoS + abuse bandwidth Vercel via /_next/image?url=...).
 *
 * ⚠️ Un nom d'hôte ne suffit pas pour Cloudinary : `res.cloudinary.com` sert
 * **tous** les comptes Cloudinary du monde. Sans `pathname`, liliafood.com
 * optimisait — à nos frais, sous notre domaine — l'image de n'importe quel
 * compte : celle du compte public `demo` répondait 200 (audit du 06/11/2026,
 * SEC-02). Le premier segment du chemin est le compte ; on n'accepte que
 * celui de Lilia, et seulement ses images déposées (`image/upload`) :
 * `image/fetch` ferait télécharger par notre compte une image prise n'importe
 * où sur le web, c'est-à-dire le même proxy ouvert (refusé aujourd'hui par
 * les réglages Cloudinary, 401 le 08/11/2026, mais un réglage se change).
 *
 * Six hôtes tiers étaient autorisés pour des `imageUrl` legacy (« Chez Maman
 * Lili », « Eau Minerale Vival »), « à retirer dès que » ces images seraient
 * sur Cloudinary. C'est fait : le 08/11/2026, les URL d'images des données
 * publiques (vendeurs, produits, menus, bannières) étaient toutes sur
 * `res.cloudinary.com/dun9ev7pw/image/upload/`.
 *
 * ⚠️ Firebase Storage et les avatars Google restent autorisés par nom d'hôte
 * seul, donc pour tous les comptes : même défaut, pas encore traité.
 */
export function imageRemotePatterns(): RemotePatterns {
  return [
    { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dun9ev7pw/image/upload/**' },
    { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    // Avatars Google (sign-in Firebase Google provider).
    { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
  ];
}
