/**
 * Whitelist les redirections post-login aux chemins internes (relatifs).
 *
 * Bloque le credential phishing classique :
 *   /connexion?redirect=https://evil.com
 *
 * Une URL acceptée doit :
 * - commencer par "/" (chemin absolu interne),
 * - ne pas commencer par "//" (protocol-relative),
 * - ne pas être de la forme "http(s):..." (URL absolue).
 *
 * Tout le reste retombe sur le fallback `/restaurants`.
 *
 * ⚠️ Contrôler la chaîne ne suffit pas : l'analyseur d'URL du navigateur la
 * réécrit avant de résoudre. Il supprime tabulations et sauts de ligne —
 * `/\t/evil.com` (`?redirect=/%09/evil.com`, que `searchParams.get` décode)
 * devient `//evil.com` — et changeait déjà l'antislash en slash. Chaque forme
 * passait les contrôles de préfixe un par un. On résout donc l'URL comme le
 * fera le navigateur et on exige qu'elle reste sur le site ; on ne renvoie que
 * le chemin résolu, jamais la saisie.
 */
const RESOLUTION_ORIGIN = 'https://redirect.invalid';

export function sanitizeRedirect(value: string | null | undefined): string {
  const fallback = '/restaurants';
  if (!value) return fallback;

  // Caractères de contrôle : l'analyseur en retire certains en silence. Aucun
  // chemin légitime n'en contient.
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  // Les navigateurs normalisent l'antislash en slash dans une URL : `/\evil.com`
  // et `/\/evil.com` sont donc résolus comme `//evil.com`.
  const normalized = value.replace(/\\/g, '/');

  // Doit commencer par "/" (chemin absolu interne) mais pas par "//"
  // (protocol-relative). Exclut aussi tout schéma (https:, javascript:, data:).
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(normalized, RESOLUTION_ORIGIN);
  } catch {
    return fallback;
  }
  if (resolved.origin !== RESOLUTION_ORIGIN) return fallback;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
