import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL ?? 'https://lilia-backend.onrender.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    // Back-office interne : les images (menus, vitrine, produits…) sont des
    // URLs saisies librement par les admins / restaurateurs (y compris via le
    // mobile admin) — un allowlist d'hôtes serait du whack-a-mole permanent.
    // On désactive l'optimiseur next/image pour l'admin : sans le proxy
    // `/_next/image`, le vecteur d'open-proxy/DoS disparaît et tous les hôtes
    // passent. L'optimisation n'a aucun intérêt sur un dashboard à faible trafic.
    unoptimized: true,
  },
  /**
   * Proxy de développement uniquement.
   *
   * Ce rewrite était actif en production, et le matcher du middleware
   * (`proxy.ts`) exclut tout chemin commençant par `api` : `/api-proxy/*`
   * n'était donc protégé par rien. N'importe qui pouvait appeler
   * `https://lilia-food-admin.vercel.app/api-proxy/vendors` et atteindre le
   * backend de production sans authentification.
   *
   * L'autorisation elle-même n'était pas contournable — le backend continue
   * d'exiger le Bearer token Firebase. Le problème était le relais : masquage
   * d'IP, contournement d'un rate-limiting par IP, et amplification de charge
   * vers un service Render qui s'endort, le tout imputé à notre domaine et à
   * notre quota Vercel.
   *
   * En production l'admin appelle `NEXT_PUBLIC_API_URL` directement (vérifié
   * dans les bundles servis) : ce rewrite n'y servait à rien. Il reste utile
   * en local, où `.env.local` pointe `NEXT_PUBLIC_API_URL` sur `/api-proxy`
   * pour éviter les problèmes de CORS.
   */
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },

  /**
   * En-têtes de sécurité — aucun n'était servi.
   *
   * L'enjeu est plus fort que sur le site vitrine : une page tierce pouvant
   * encadrer ce back-office peut détourner les clics d'un administrateur
   * authentifié sur des actions irréversibles (valider un vendeur, confirmer
   * un paiement, supprimer). `frame-ancestors 'none'` ferme ce vecteur.
   *
   * `noindex` est déjà posé en métadonnée ; `X-Robots-Tag` le double au
   * niveau HTTP, y compris sur les réponses non-HTML.
   *
   * La CSP est en **Report-Only** : bloquante d'emblée, une politique mal
   * calibrée casse l'interface en silence. À basculer après observation.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // Requis par le bootstrap de Next — à resserrer via nonce avant de
      // passer la CSP en mode bloquant.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // `images.unoptimized` : les URLs d'images sont saisies librement par
      // les vendeurs, elles peuvent pointer sur n'importe quel hôte HTTPS.
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://lilia-backend.onrender.com https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Un back-office ne doit jamais fuiter ses URLs vers l'extérieur :
          // elles contiennent des identifiants de commandes et de vendeurs.
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()',
          },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
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
