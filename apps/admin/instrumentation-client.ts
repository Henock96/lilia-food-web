// Configuration Sentry — runtime navigateur (apps/admin).
// Auto-détecté par Next.js, exécuté avant le rendu de l'app.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN injecté au build via NEXT_PUBLIC_SENTRY_DSN. Vide en local → Sentry inactif.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Le contexte user (id/email/role) est attaché explicitement après login.
  sendDefaultPii: false,
});

// Instrumente les transitions de navigation de l'App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
