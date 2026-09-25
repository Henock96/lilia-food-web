import {
  EmailAuthProvider,
  getMultiFactorResolver,
  multiFactor,
  reauthenticateWithCredential,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorInfo,
  type TotpSecret,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { ApiError } from '@lilia/api-client';
import { getFirebaseAuth } from './firebase';

/**
 * Double authentification des administrateurs (F3-08, phase 2) — TOTP
 * (Google Authenticator, Microsoft Authenticator…), via Firebase Identity
 * Platform.
 *
 * Le serveur exige, quand `ADMIN_MFA_REQUIRED=true` :
 *  - un second facteur dans le jeton pour les gestes sensibles
 *    (403 `MFA_REQUIRED`) ;
 *  - une authentification de moins de 15 min pour les gestes financiers
 *    (401 `MFA_STEP_UP_REQUIRED`) — d'où la réauthentification ci-dessous.
 */

export const TOTP_ISSUER = 'Lilia Food Admin';

/** Firebase a besoin du second facteur pour finir la connexion. */
export function isMfaChallenge(error: unknown): error is MultiFactorError {
  return (error as { code?: string })?.code === 'auth/multi-factor-auth-required';
}

/** Ce que le serveur demande en réponse à un geste. */
export function mfaDemand(
  error: unknown,
): 'ENROLL' | 'STEP_UP' | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'MFA_REQUIRED') return 'ENROLL';
  if (error.code === 'MFA_STEP_UP_REQUIRED') return 'STEP_UP';
  return null;
}

/** Le facteur TOTP parmi ceux proposés ; `null` si l'admin n'en a pas. */
export function pickTotpHint(
  hints: readonly Pick<MultiFactorInfo, 'factorId' | 'uid'>[],
): Pick<MultiFactorInfo, 'factorId' | 'uid'> | null {
  return hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? null;
}

/** Code à 6 chiffres, tel que l'affichent les applications d'authentification. */
export function isTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function hasTotp(user: User | null): boolean {
  return (
    !!user &&
    multiFactor(user).enrolledFactors.some(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
    )
  );
}

/**
 * Termine une connexion interrompue par le second facteur. `error` est
 * l'erreur `auth/multi-factor-auth-required` rendue par la connexion (ou la
 * réauthentification).
 */
export async function resolveWithTotp(
  error: MultiFactorError,
  code: string,
): Promise<UserCredential> {
  const resolver = getMultiFactorResolver(getFirebaseAuth(), error);
  const hint = pickTotpHint(resolver.hints);
  if (!hint) {
    throw new Error('Aucune application d’authentification n’est associée à ce compte.');
  }
  return resolver.resolveSignIn(
    TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code),
  );
}

/**
 * Réauthentifie l'administrateur connecté (mot de passe) : rafraîchit
 * `auth_time` pour les gestes financiers, et ouvre la génération d'un secret
 * TOTP (Firebase exige une connexion récente). Si le compte a déjà un second
 * facteur, Firebase lève `auth/multi-factor-auth-required` : l'appelant le
 * résout avec `resolveWithTotp`.
 */
export async function reauthenticate(password: string): Promise<UserCredential> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error('Session expirée : reconnectez-vous.');
  return reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
}

/** Étape 1 de l'inscription : un secret, et l'URI à scanner. */
export async function startTotpEnrollment(): Promise<{
  secret: TotpSecret;
  otpauthUri: string;
  secretKey: string;
}> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Session expirée : reconnectez-vous.');
  const session = await multiFactor(user).getSession();
  const secret = await TotpMultiFactorGenerator.generateSecret(session);
  return {
    secret,
    otpauthUri: secret.generateQrCodeUrl(user.email ?? user.uid, TOTP_ISSUER),
    secretKey: secret.secretKey,
  };
}

/** Étape 2 : le code affiché par l'application prouve que le secret est bien enregistré. */
export async function finishTotpEnrollment(
  secret: TotpSecret,
  code: string,
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Session expirée : reconnectez-vous.');
  await multiFactor(user).enroll(
    TotpMultiFactorGenerator.assertionForEnrollment(secret, code),
    'Application d’authentification',
  );
}

/** Messages lisibles pour les erreurs Firebase de ce parcours. */
export function mfaErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-verification-code':
      return 'Code incorrect ou expiré. Saisissez le code actuellement affiché.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Mot de passe incorrect.';
    case 'auth/requires-recent-login':
      return 'Confirmez d’abord votre mot de passe.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'La double authentification n’est pas encore activée sur le projet Firebase.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    default:
      return (error as Error)?.message || 'Opération impossible.';
  }
}
