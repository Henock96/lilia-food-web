// Configuration Sentry — runtime serveur Node.js (apps/admin).
// Importé par instrumentation.ts quand NEXT_RUNTIME === 'nodejs'.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN injecté via env Vercel. Vide en local → Sentry reste inactif.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Le contexte user (id/email/role) est attaché explicitement après login.
  sendDefaultPii: false,
});
