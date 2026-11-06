import type { User } from '@lilia/types';
import type { SessionCredential } from '@lilia/api-client';

export interface Identity {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

export interface SessionState {
  uid: string | null;
  generation: number;
  /** Last external identity boundary; preserves a form's own login continuation. */
  formResetKey: number;
  phase: 'loading' | 'anonymous' | 'authenticating' | 'syncing' | 'ready' | 'error';
  user: User | null;
  firebaseDisplayName: string | null;
  firebasePhotoUrl: string | null;
  error: string | null;
}

export const INITIAL_SESSION: SessionState = {
  uid: null, generation: 0, formResetKey: 0, phase: 'loading', user: null,
  firebaseDisplayName: null, firebasePhotoUrl: null, error: null,
};

export class ObsoleteSession extends Error {
  constructor() { super('Cette session a été remplacée.'); this.name = 'SessionObsoleteError'; }
}

export interface SessionPorts {
  currentUser(): Identity | null;
  syncProfile(user: Identity, token: string, signal: AbortSignal, details?: Record<string, string>): Promise<User>;
  cookie(intent: { token: string | null; isCurrent(): boolean }): Promise<'applied' | 'obsolete'>;
  signOut(): Promise<void>;
  publish(state: SessionState): void;
  resetPrivateState(): void;
  /**
   * Séparé de `resetPrivateState`, qui tourne aussi à la connexion : le panier
   * du visiteur doit y survivre pour être versé.
   */
  purgeGuestCart(): void;
}

/** One owner of the identity generation. Tokens live only in this instance,
 * never in Zustand, storage, query keys or a server-global request context. */
export class AuthSessionController {
  private state: SessionState = { ...INITIAL_SESSION };
  private abort = new AbortController();
  private token: string | null = null;
  private credential: SessionCredential | null = null;
  private operation = 0;
  private authentication: number | null = null;
  private sync: Promise<void> | null = null;
  private refreshFlight: Promise<string> | null = null;
  private resyncFlight: Promise<void> | null = null;
  private logoutFlight: Promise<boolean> | null = null;
  private loggingOut = false;
  private blockedUid: string | null = null;
  private resyncAttempted = false;
  private profileDetails: Record<string, string> | undefined;

  constructor(private readonly ports: SessionPorts) {}

  getSnapshot = (): SessionState => this.state;
  getCredential = (): SessionCredential | null => this.state.phase === 'ready' ? this.credential : null;

  isCurrent = (context: { uid: string | null; generation: number }): boolean =>
    context.uid === this.state.uid && context.generation === this.state.generation &&
    (this.ports.currentUser()?.uid ?? null) === context.uid;

  private publish(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.ports.publish(this.state);
  }

  private reset(uid: string | null, phase: SessionState['phase']) {
    this.abort.abort();
    this.abort = new AbortController();
    this.operation++;
    this.token = null;
    this.credential = null;
    this.sync = null;
    this.refreshFlight = null;
    this.resyncFlight = null;
    this.resyncAttempted = false;
    this.profileDetails = undefined;
    this.ports.resetPrivateState();
    const generation = this.state.generation + 1;
    const formResetKey = phase === 'authenticating' ? this.state.formResetKey : generation;
    this.publish({ ...INITIAL_SESSION, uid, generation, formResetKey, phase });
  }

  private assert(context: { uid: string | null; generation: number }, operation?: number) {
    if (!this.isCurrent(context) || (operation !== undefined && operation !== this.operation)) {
      throw new ObsoleteSession();
    }
  }

  /** Hold the automatic sync until signup has supplied its phone/referral.
   * The same generation also invalidates an older login form continuation. */
  async beginAuthentication(): Promise<number> {
    if (this.logoutFlight) await this.logoutFlight;
    if (this.authentication !== null) throw new Error('Une connexion est déjà en cours.');
    this.blockedUid = null;
    this.reset(null, 'authenticating');
    this.authentication = this.state.generation;
    return this.authentication;
  }

  authenticationCurrent(ticket: number, user?: Identity): boolean {
    return ticket === this.state.generation && (!user || this.ports.currentUser()?.uid === user.uid);
  }

  async completeAuthentication(ticket: number, user: Identity, details?: Record<string, string>) {
    if (!this.authenticationCurrent(ticket, user)) throw new ObsoleteSession();
    this.authentication = null;
    this.ports.resetPrivateState();
    this.publish({ uid: user.uid, phase: 'syncing' });
    await this.synchronize(user, details);
    this.assert({ uid: user.uid, generation: ticket });
    if (this.state.phase !== 'ready') throw new Error(this.state.error ?? 'Session indisponible.');
  }

  async cancelAuthentication(ticket: number) {
    if (this.authentication !== ticket || ticket !== this.state.generation) return;
    this.authentication = null;
    await this.acceptUser(this.ports.currentUser());
  }

  async acceptUser(user: Identity | null): Promise<void> {
    if (this.authentication !== null || this.loggingOut) return;
    if (user && user.uid === this.blockedUid) return;
    // Firebase can deliver an older callback after another identity is active.
    if ((this.ports.currentUser()?.uid ?? null) !== (user?.uid ?? null)) return;
    if (!user) {
      if (this.state.uid !== null) this.reset(null, 'anonymous');
      else if (this.state.phase !== 'anonymous') this.publish({ phase: 'anonymous', user: null });
      const context = this.state;
      try {
        await this.ports.cookie({ token: null, isCurrent: () => this.isCurrent(context) });
      } catch {
        if (this.isCurrent(context)) this.publish({ error: 'La fermeture du cookie de navigation doit être réessayée.' });
      }
      return;
    }
    if (user.uid !== this.state.uid) this.reset(user.uid, 'syncing');
    if (this.refreshFlight) { await this.refreshFlight.catch(() => undefined); return; }
    if (this.sync) return this.sync;
    return this.synchronize(user);
  }

  private synchronize(user: Identity, details?: Record<string, string>): Promise<void> {
    if (details) this.profileDetails = details;
    const context = this.state;
    const operation = ++this.operation;
    const signal = this.abort.signal;
    const run = async () => {
      try {
        const token = await user.getIdToken();
        this.assert(context, operation);
        this.token = token;
        const profile = this.state.user ?? await this.ports.syncProfile(user, token, signal, this.profileDetails);
        this.assert(context, operation);
        if (profile.firebaseUid && profile.firebaseUid !== user.uid) throw new Error('Identité du profil incohérente.');
        const applied = await this.ports.cookie({ token, isCurrent: () => this.isCurrent(context) && operation === this.operation });
        this.assert(context, operation);
        if (applied !== 'applied') throw new ObsoleteSession();
        this.profileDetails = undefined;
        this.credential ??= {
          uid: user.uid, generation: context.generation, signal,
          isCurrent: () => this.isCurrent(context),
          getToken: () => { this.assert(context); if (!this.token) throw new ObsoleteSession(); return this.token; },
          refresh: () => this.refresh(context, user),
          onAuthError: (error) => this.onAuthError(context, user, error),
        };
        this.publish({ phase: 'ready', user: profile, firebaseDisplayName: user.displayName,
          firebasePhotoUrl: user.photoURL, error: null });
      } catch (error) {
        if (!this.isCurrent(context) || operation !== this.operation) return;
        const authError = error as { status?: number; code?: string };
        if (authError.status === 401 || authError.code === 'ACCOUNT_REVOKED' ||
          authError.code === 'auth/user-disabled' || authError.code === 'auth/user-token-expired' ||
          authError.code === 'auth/user-not-found') {
          await this.logout();
          return;
        }
        this.token = null;
        this.credential = null;
        this.ports.resetPrivateState();
        this.publish({ phase: 'error', user: null, error: 'La session ne peut pas être vérifiée. Réessayez.' });
      } finally {
        if (this.isCurrent(context) && operation === this.operation) this.sync = null;
      }
    };
    this.sync = run();
    return this.sync;
  }

  private refresh(context: SessionState, user: Identity): Promise<string> {
    this.assert(context);
    if (this.refreshFlight) return this.refreshFlight;
    const operation = ++this.operation;
    this.sync = null;
    const flight = (async () => {
      try {
        const token = await user.getIdToken(true);
        this.assert(context, operation);
        this.token = token;
        const result = await this.ports.cookie({ token, isCurrent: () => this.isCurrent(context) && operation === this.operation });
        this.assert(context, operation);
        if (result !== 'applied') throw new ObsoleteSession();
        return token;
      } catch (error) {
        if (this.isCurrent(context) && operation === this.operation) await this.logout();
        throw error;
      } finally {
        if (this.isCurrent(context)) this.refreshFlight = null;
      }
    })();
    this.refreshFlight = flight;
    return flight;
  }

  private async onAuthError(context: SessionState, user: Identity, error: { status: number; code?: string }) {
    this.assert(context);
    if (error.code === 'ACCOUNT_NOT_SYNCED' && this.resyncFlight) return this.resyncFlight;
    if (error.code === 'ACCOUNT_NOT_SYNCED' && !this.resyncAttempted) {
      this.resyncAttempted = true;
      this.ports.resetPrivateState();
      this.publish({ phase: 'syncing', user: null });
      const flight = this.synchronize(user);
      this.resyncFlight = flight;
      try { await flight; } finally {
        if (this.resyncFlight === flight) this.resyncFlight = null;
      }
      return;
    }
    if (error.status === 401 || error.code === 'ACCOUNT_REVOKED' || error.code === 'ACCOUNT_NOT_SYNCED') {
      await this.logout();
    }
  }

  updateProfile(user: User, context: { uid: string | null; generation: number }) {
    if (!this.isCurrent(context) || this.state.phase !== 'ready') return;
    if (user.firebaseUid && user.firebaseUid !== context.uid) return;
    this.publish({ user });
  }

  logout(): Promise<boolean> {
    if (this.logoutFlight) return this.logoutFlight;
    // Seule la fermeture d'une session ouverte purge : ces lignes (versement
    // interrompu) sont à celui qui part, et le compte suivant sur ce navigateur
    // pourrait les payer. Un échec pendant la connexion, lui, passe aussi par
    // ici : le visiteur doit y garder son panier.
    if (this.state.phase === 'ready') this.ports.purgeGuestCart();
    this.loggingOut = true;
    this.blockedUid = this.ports.currentUser()?.uid ?? null;
    this.authentication = null;
    this.reset(null, 'loading');
    const generation = this.state.generation;
    const flight = (async () => {
      try {
        await this.ports.signOut();
        if (generation !== this.state.generation || this.ports.currentUser()) return false;
        this.blockedUid = null;
        this.publish({ phase: 'anonymous' });
        const result = await this.ports.cookie({ token: null, isCurrent: () =>
          generation === this.state.generation && this.ports.currentUser() === null });
        return result === 'applied' && generation === this.state.generation && this.ports.currentUser() === null;
      } catch {
        if (generation === this.state.generation) this.publish({ phase: 'anonymous', error: 'Déconnexion locale effectuée. Réessayez la fermeture de session.' });
        return false;
      } finally {
        this.loggingOut = false;
        this.logoutFlight = null;
        const current = this.ports.currentUser();
        if (current && current.uid !== this.blockedUid) await this.acceptUser(current);
      }
    })();
    this.logoutFlight = flight;
    return flight;
  }
}
