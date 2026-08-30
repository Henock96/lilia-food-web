import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  // turbopack.root = monorepo root pour que les symlinks pnpm soient accessibles
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    // Allowlist strict — bloque l'open proxy d'optimisation next/image
    // (DoS + abuse bandwidth Vercel via /_next/image?url=...).
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Avatars Google (sign-in Firebase Google provider).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Champ `imageUrl` legacy du vendeur « Chez Maman Lili ». Autorisé à la
      // demande du founder pour que son image s'affiche. À retirer dès que ce
      // vendeur aura une photo hébergée sur Cloudinary : cette URL pointe vers
      // le serveur d'un tiers, donc l'image peut disparaître ou changer sans
      // préavis, et nous n'en maîtrisons ni la disponibilité ni les droits.
      { protocol: 'https', hostname: 'sogood.paris' },
      { protocol: 'https', hostname: 'kelianfood.com' },
      { protocol: 'https', hostname: 'static.750g.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'www.magasin-stalingrad.com' },
      // Champ `imageUrl` legacy du produit « Eau Minerale Vival ». C'est un lien
      // de miniature Google Images : il expirera de lui-même, Google ne garantit
      // aucune pérennité sur ces URLs. Autorisé à la demande du founder pour
      // débloquer l'affichage ; la vraie correction est de remplacer l'image du
      // produit côté admin, après quoi cette entrée doit disparaître.
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://lilia-backend.onrender.com',
  },

  /**
   * En-têtes de sécurité — la production n'en servait aucun en dehors de
   * HSTS. Le site héberge un tunnel de commande authentifié : sans
   * `frame-ancestors`, une page tierce peut l'encadrer et détourner les clics
   * sur la validation de commande.
   *
   * La CSP est délibérément posée en **Report-Only**. Next injecte des scripts
   * inline (bootstrap, flight data) et une CSP mal calibrée casse la page en
   * silence, sans erreur visible côté serveur. On observe d'abord les
   * violations rapportées, puis on bascule cet en-tête sur
   * `Content-Security-Policy` une fois la politique stabilisée.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // `unsafe-inline` et `unsafe-eval` : requis par le bootstrap de Next.
      // C'est précisément ce qu'il faut resserrer (via nonce) avant de passer
      // la CSP en mode bloquant.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // Backend Render, Firebase Auth, Cloudinary, Sentry.
      "connect-src 'self' https://lilia-backend.onrender.com https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
      // Popup de connexion Google (signInWithPopup).
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          // Empêche le navigateur de réinterpréter le type MIME déclaré.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Doublon volontaire de `frame-ancestors`, pour les navigateurs
          // anciens qui ne lisent pas la CSP.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Par défaut, l'URL complète partait vers chaque domaine tiers.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), payment=(), interest-cohort=()',
          },
          // HSTS était servi sans `includeSubDomains` ni `preload`.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Slugs du projet Sentry — définis en env Vercel (diffèrent entre web et admin).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Upload des source maps au build Vercel (nécessite SENTRY_AUTH_TOKEN en env).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Logs verbeux du plugin uniquement en CI.
  silent: !process.env.CI,
});
