/** A credential is bound to one Firebase identity and one session generation. */
export interface SessionCredential {
  uid: string;
  generation: number;
  signal: AbortSignal;
  isCurrent(): boolean;
  getToken(): string;
  refresh(): Promise<string>;
  onAuthError(error: { status: number; code?: string }): Promise<void>;
}
export type AuthCredential = string | SessionCredential;
export class SessionObsoleteError extends Error {
  constructor() {
    super('Cette session n’est plus active.');
    this.name = 'SessionObsoleteError';
  }
}
export function assertCurrentSession(credential?: AuthCredential | null): void {
  if (credential && typeof credential !== 'string' &&
      (credential.signal.aborted || !credential.isCurrent())) {
    throw new SessionObsoleteError();
  }
}
export function sessionSignal(credential?: AuthCredential | null, signal?: AbortSignal | null): AbortSignal | undefined {
  const session = credential && typeof credential !== 'string' ? credential.signal : undefined;
  if (!session) return signal ?? undefined;
  return signal ? AbortSignal.any([signal, session]) : session;
}
