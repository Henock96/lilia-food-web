import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import path from 'path';
import { apiConnectSources, cspReporting } from './lib/csp-report';
import { imageRemotePatterns } from './lib/image-remote-patterns';
import { legalRedirects } from './lib/legal-redirects';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  // Next 16.4 avertit quand cette option manque. Absente, elle vaut `false` :
  // c'est le comportement de la 16.3, qu'on garde. L'activer change le
  // préchargement des navigations ; à mesurer avant (règle 27).
  partialPrefetching: false,
  // turbopack.root = monorepo root pour que les symlinks pnpm soient accessibles
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
  // Plus de bloc `env` injectant l'URL de production par défaut (CFG-001) :
  // il l'inlinait aussi en `next dev`, si bien qu'un poste sans `.env.local`
  // écrivait dans la vraie base. Le repli de production vit désormais dans
  // `@lilia/api-client` (`resolveApiUrl`), limité aux builds de production.

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
  async redirects() {
    return legalRedirects();
  },
  async headers() {
    // Rapports envoyés à Sentry (L0-10) : sans destination, le mode
    // Report-Only n'observait rien. Absent en local, faute de DSN.
    const reporting = cspReporting(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV);

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
      `connect-src 'self' ${apiConnectSources(process.env.NEXT_PUBLIC_API_URL)} https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io`,
      // Popup de connexion Google (signInWithPopup).
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
      ...reporting.directives,
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          ...reporting.headers,
          // Empêche le navigateur de réinterpréter le type MIME déclaré.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Doublon volontaire de `frame-ancestors`, pour les navigateurs
          // anciens qui ne lisent pas la CSP.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Par défaut, l'URL complète partait vers chaque domaine tiers.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // `geolocation=()` : le site ne lit jamais la position (l'adresse
            // de livraison passe par le quartier). Un script tiers non plus.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()',
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
