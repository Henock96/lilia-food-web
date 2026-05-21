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
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
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
