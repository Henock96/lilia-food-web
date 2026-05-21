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
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${BACKEND_URL}/:path*`,
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
