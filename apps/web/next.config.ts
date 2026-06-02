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
      // Visuels marketing utilisés dans hero-section.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://lilia-backend.onrender.com',
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
