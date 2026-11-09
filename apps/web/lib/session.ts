import { hasSessionCookieInBrowser } from './session-cookie';

export type SessionCookieResult = 'applied' | 'obsolete';

export interface SessionCookieIntent {
  token: string | null;
  /** Vérifie la génération ET auth.currentUser, aussi après attente du verrou. */
  isCurrent: () => boolean;
}

type CookieWork = () => Promise<SessionCookieResult>;

interface CookieCoordinatorOptions {
  fetch?: typeof fetch;
  withLock?: (work: CookieWork) => Promise<SessionCookieResult>;
  /** Le témoin est-il posé ? Lu sous verrou : un autre onglet a pu le poser. */
  hasSessionCookie?: () => boolean;
}

const COOKIE_LOCK = 'lilia-session-cookie';

async function browserLock(work: CookieWork): Promise<SessionCookieResult> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request(COOKIE_LOCK, work);
  }
  // Sans Web Locks, seule la file de cet onglet est garantie. Le cookie est
  // un indicateur de navigation ; il n'autorise jamais l'accès aux données.
  return work();
}

/**
 * Writer unique du cookie de navigation. Chaque onglet sérialise ses intentions
 * et Web Locks sérialise les requêtes entre onglets de même origine compatibles.
 * Aucun token n'est transmis à un autre onglet.
 *
 * Ne pas interrompre une écriture envoyée pour lancer la suivante : ignorer une
 * promesse n'annule pas un Set-Cookie. L'appelant doit soumettre la nouvelle
 * intention même si l'ancienne est encore en cours. Une panne réseau laisse
 * l'issue du cookie incertaine : la promesse rejette, sans annoncer de succès,
 * et la prochaine intention peut réconcilier l'état. Ce protocole ne garantit
 * pas l'ordre après crash d'un onglet ou en l'absence de Web Locks.
 * Web Locks garantit l'exclusion, pas la dernière intention globale : si la
 * propagation Firebase entre onglets est retardée, la cohérence est seulement
 * convergente après réception des changements d'identité par tous les onglets.
 */
export function createSessionCookieCoordinator(options: CookieCoordinatorOptions = {}) {
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const withLock = options.withLock ?? browserLock;
  const hasSessionCookie = options.hasSessionCookie ?? hasSessionCookieInBrowser;
  let queue: Promise<unknown> = Promise.resolve();

  return {
    reconcile(intent: SessionCookieIntent): Promise<SessionCookieResult> {
      const operation = queue.then(() => {
        if (!intent.isCurrent()) return 'obsolete' as const;
        return withLock(async () => {
          if (!intent.isCurrent()) return 'obsolete';
          // Visiteur anonyme : rien à effacer, donc pas d'appel (PERF-07). Une
          // fonction Vercel partait à chaque visite pour un cookie absent.
          if (intent.token === null && !hasSessionCookie()) return 'applied';
          const response = await send('/api/auth/session', intent.token === null
            ? { method: 'DELETE' }
            // Sans corps : le cookie n'est qu'un témoin (`lib/session-cookie.ts`),
            // le jeton n'a pas à quitter le navigateur pour le poser.
            : { method: 'POST' });
          if (!response.ok) {
            throw new Error(`Écriture du cookie de session refusée (${response.status})`);
          }
          // Set-Cookie peut déjà être appliqué. Cette valeur interdit seulement
          // une navigation obsolète ; l'intention suivante corrige le cookie.
          return intent.isCurrent() ? 'applied' : 'obsolete';
        });
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}

const sessionCookies = createSessionCookieCoordinator();

export const reconcileSessionCookie = sessionCookies.reconcile;
