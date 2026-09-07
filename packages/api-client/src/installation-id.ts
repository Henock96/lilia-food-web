/**
 * Identifiant **d'installation** du navigateur.
 *
 * ## Ce que c'est
 *
 * Un UUID v4 tiré au premier chargement et conservé dans `localStorage`. Il est
 * envoyé en en-tête `X-Lilia-Installation-Id`, où il sert de signal anti-abus
 * au parrainage : plusieurs comptes créés depuis le même navigateur pèsent sur
 * la décision de récompenser un parrain.
 *
 * ## Ce que ce n'est pas
 *
 * Ce n'est **pas** une empreinte de navigateur, et volontairement pas. Aucun
 * `canvas fingerprinting`, aucune collecte de polices, de résolution ou de
 * plugins : ces techniques identifient une personne à travers les sites, ce
 * qui dépasse de loin le besoin — repérer une série de comptes créés au même
 * endroit — et ce que le visiteur peut raisonnablement attendre.
 *
 * Conséquences assumées : vider ses données de site, ouvrir une fenêtre privée
 * ou changer de navigateur remet le compteur à zéro. C'est pourquoi le serveur
 * ne s'en sert que pour **pondérer** une décision de récompense, jamais pour
 * bloquer un compte.
 *
 * ## Rendu serveur
 *
 * `localStorage` n'existe pas côté Node. La fonction rend `null` dans ce cas —
 * un signal absent est traité comme absent par le serveur, ce n'est pas une
 * erreur. C'est aussi la raison pour laquelle elle n'est jamais appelée au
 * module load : elle l'est à la construction des en-têtes, donc dans le
 * navigateur.
 */

const STORAGE_KEY = 'lilia_installation_id';

/** Mémorisé : la valeur ne change jamais et l'en-tête est posé sur chaque appel. */
let cached: string | null = null;

/** UUID v4 depuis `crypto`, avec repli pour les contextes non sécurisés. */
function generateUuidV4(): string {
  // ⚠️ Ne pas écrire `'randomUUID' in crypto` : TypeScript réduit alors le type
  // de `crypto` à `never` dans la branche suivante, et `getRandomValues`
  // devient inaccessible. On passe par une variable locale typée.
  const webCrypto: Crypto | undefined =
    typeof crypto !== 'undefined' ? crypto : undefined;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Dernier recours (contexte non sécurisé, HTTP en local). Un identifiant
  // moins imprévisible reste préférable à aucun signal — et il ne protège
  // rien à lui seul, par construction.
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Retourne l'identifiant, en le créant au premier appel.
 * `null` côté serveur, ou si le stockage est refusé (mode privé strict).
 */
export function getInstallationId(): string | null {
  if (cached) return cached;
  if (typeof window === 'undefined') return null;
  try {
    let value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) {
      value = generateUuidV4();
      window.localStorage.setItem(STORAGE_KEY, value);
    }
    cached = value;
    return value;
  } catch {
    // `localStorage` peut lever (Safari en navigation privée stricte, quota).
    // On ne casse jamais une requête pour un signal facultatif.
    return null;
  }
}

/** En-têtes d'installation, vides quand le signal est indisponible. */
export function installationHeaders(): Record<string, string> {
  const id = getInstallationId();
  return id ? { 'X-Lilia-Installation-Id': id, 'X-Lilia-Platform': 'web' } : {};
}
