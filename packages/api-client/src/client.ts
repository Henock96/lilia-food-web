export const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'https://lilia-backend.onrender.com')
    : (process.env.API_URL ?? 'https://lilia-backend.onrender.com');

/**
 * Capacité de paiement annoncée à chaque requête.
 *
 * `provider` signifie : « je sais conduire un encaissement piloté par le
 * prestataire » — demande envoyée sur le téléphone du client, écran d'attente,
 * interrogation du statut jusqu'à l'issue.
 *
 * Le serveur refuse d'ouvrir un tel encaissement à un client qui ne l'annonce
 * pas (426 `CLIENT_UPGRADE_REQUIRED`). Sans cette garde, une application écrite
 * pour le virement manuel affiche sa consigne avec un numéro vide pendant que
 * le prestataire sollicite réellement le téléphone du client.
 *
 * ⚠️ Déclaratif, donc falsifiable : ce n'est pas un contrôle de sécurité, mais
 * un contrôle de compatibilité. Ne jamais s'en servir pour autoriser quoi que
 * ce soit.
 */
const PAYMENT_FLOW_CAPABILITY = 'provider';

/**
 * Taille de page maximale acceptée par l'API (`MAX_PAGE_SIZE` côté backend).
 *
 * Elle est écrite ici parce qu'elle était jusqu'ici devinée, différemment, à
 * chaque appel : `limit=200` sur le catalogue, `limit=100` sur les vendeurs.
 * Le serveur répond 400 au-delà, et un 400 sur une liste se lit comme une liste
 * vide — c'est ainsi que le back-office produits est devenu muet sans qu'aucune
 * erreur ne s'affiche nulle part.
 *
 * ⚠️ Demander plus n'est jamais la bonne réponse à « il me manque des
 * éléments » : il faut paginer. Cette constante est un plafond, pas un objectif.
 */
export const MAX_PAGE_SIZE = 100;

type FetchOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /**
     * Code métier renvoyé par le backend quand il en pose un
     * (`PAYMENT_NOT_MANUAL`, `PAYOUT_IN_PROGRESS`, `ORDER_NOT_READY`…).
     *
     * Sans lui, l'interface ne peut réagir qu'au code HTTP et doit deviner en
     * lisant le message français — qui n'est pas un contrat. Utile surtout sur
     * les 409 de paiement, où « déjà payé » et « virement en cours » appellent
     * deux réactions opposées.
     */
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Construit l'`ApiError` d'une réponse non-OK, code métier compris.
 *
 * ⚠️ `HttpExceptionFilter` extrait le `message` du payload d'exception et range
 * **tout le reste** sous `error` : un `ConflictException({ message, code })`
 * arrive donc en `{ message, error: { code } }`, pas avec un `code` à la racine.
 * On lit les deux, pour ne pas dépendre de ce détail de rangement.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response
    .json()
    .catch(() => ({ message: response.statusText }))) as {
    message?: string | string[];
    code?: string;
    error?: { code?: string } | string | null;
  };
  const message = Array.isArray(body.message)
    ? body.message.join(' ')
    : (body.message ?? `HTTP ${response.status}`);
  const nested =
    body.error && typeof body.error === 'object' ? body.error.code : undefined;
  return new ApiError(response.status, message, body.code ?? nested);
}

/**
 * Client HTTP par défaut.
 *
 * Le backend Lilia migre progressivement vers une enveloppe normalisée
 * `{ data, message?, meta? }` (voir branche `api-contract-v2`). Pour tolérer
 * les deux formats pendant la migration, ce helper :
 *  1. détecte explicitement la présence de la clé `data` ;
 *  2. déballe `data` quand elle existe ;
 *  3. en dev uniquement, avertit lorsqu'une route renvoie une réponse non
 *     enveloppée pour faciliter le repérage des endpoints restants à migrer.
 *
 * Pour les endpoints qui ne doivent pas être déballés (pagination
 * `{ data, total, page, limit }`, etc.), utiliser {@link apiClientRaw}.
 */
export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Lilia-Payment-Flow': PAYMENT_FLOW_CAPABILITY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const json: unknown = await response.json();

  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[apiClient] ${path} response not wrapped in { data }. Migrate backend or use apiClientRaw.`,
    );
  }

  return json as T;
}

/**
 * Échappatoire — variante de {@link apiClient} qui retourne le JSON **brut**,
 * sans déballer l'enveloppe `{ data }`. À utiliser pour :
 *  - les réponses paginées `{ data, total, page, limit }` dont on doit
 *    conserver les métadonnées ;
 *  - les endpoints legacy non encore migrés vers l'enveloppe v2 qui renvoient
 *    déjà directement le payload ;
 *  - les routes externes qui ne suivent pas la convention Lilia.
 */
export async function apiClientRaw<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Lilia-Payment-Flow': PAYMENT_FLOW_CAPABILITY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}
