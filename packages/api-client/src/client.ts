export const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'https://lilia-backend.onrender.com')
    : (process.env.API_URL ?? 'https://lilia-backend.onrender.com');

type FetchOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, (error as { message?: string }).message ?? `HTTP ${response.status}`);
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, (error as { message?: string }).message ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
