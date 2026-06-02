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
  // Refuse les URLs absolues (http://, https://) — credential phishing.
  if (/^https?:/i.test(value)) return fallback;
  // Refuse les URLs protocol-relative (//evil.com).
  if (value.startsWith('//')) return fallback;
  // Doit commencer par "/" pour être un chemin interne.
  if (!value.startsWith('/')) return fallback;
  return value;
}
