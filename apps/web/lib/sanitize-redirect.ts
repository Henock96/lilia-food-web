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
 */
export function sanitizeRedirect(value: string | null | undefined): string {
  const fallback = '/restaurants';
  if (!value) return fallback;

  // Les navigateurs normalisent l'antislash en slash dans une URL : `/\evil.com`
  // et `/\/evil.com` sont donc résolus comme `//evil.com`, c'est-à-dire une
  // redirection externe. Ces formes passaient les trois contrôles ci-dessous
  // (ne commencent ni par `//` ni par `http:`, commencent bien par `/`). On
  // normalise donc AVANT de contrôler, plutôt que de tester la chaîne brute.
  const normalized = value.replace(/\\/g, '/');

  // Refuse tout schéma d'URL (http:, https:, mais aussi javascript:, data:).
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return fallback;
  // Refuse les URLs protocol-relative (//evil.com).
  if (normalized.startsWith('//')) return fallback;
  // Doit commencer par "/" pour être un chemin interne.
  if (!normalized.startsWith('/')) return fallback;

  return normalized;
}
