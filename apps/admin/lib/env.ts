/**
 * Validation des variables d'environnement publiques.
 *
 * L'admin n'en avait aucune, contrairement à `apps/web`. Une variable
 * Firebase absente ou vide ne se manifestait donc qu'au moment de la
 * connexion, sous la forme d'une erreur opaque du SDK
 * (`auth/invalid-api-key`) — sur l'unique écran où l'on ne peut pas se
 * permettre d'être ambigu.
 *
 * Pas de Zod ici, contrairement au web : la règle se résume à « présent et
 * non vide », et ajouter une dépendance au bundle d'un back-office pour six
 * chaînes de caractères ne se justifie pas.
 *
 * Next.js remplace les `NEXT_PUBLIC_*` à la compilation : chacune doit être
 * référencée **statiquement**, jamais via un accès dynamique
 * `process.env[nom]`, sans quoi la substitution n'a pas lieu.
 */

const RAW = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

type EnvKey = keyof typeof RAW;

/**
 * Renvoie la liste des variables manquantes, sans jamais lever.
 *
 * On ne lève pas au chargement du module : `lib/firebase.ts` initialise
 * volontairement Firebase de façon paresseuse pour que le build et le rendu
 * serveur fonctionnent sans secrets. Lever ici casserait cette propriété.
 * C'est à l'appelant — au moment où il a réellement besoin de Firebase — de
 * décider quoi faire du résultat.
 */
export function getMissingEnvKeys(): EnvKey[] {
  return (Object.keys(RAW) as EnvKey[]).filter((key) => {
    const value = RAW[key];
    return typeof value !== 'string' || value.trim() === '';
  });
}

/**
 * Vérifie la configuration Firebase et lève un message exploitable.
 *
 * Appelé juste avant l'initialisation du SDK : l'erreur nomme les variables
 * en cause, au lieu de laisser remonter `auth/invalid-api-key`.
 */
export function assertFirebaseEnv(): void {
  const missing = getMissingEnvKeys();
  if (missing.length === 0) return;

  throw new Error(
    `Configuration Firebase incomplète — variables manquantes : ${missing.join(', ')}. ` +
      'Voir apps/admin/.env.example, et les variables du projet sur Vercel.',
  );
}
