// Helpers de session : posent/suppriment le cookie HttpOnly `firebase-token`
// via la route serveur /api/auth/session (le cookie n'est plus manipulé en
// clair via document.cookie côté client — protection XSS).

export async function setSessionCookie(token: string): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort : si la pose échoue, le proxy redirigera vers /connexion
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // best-effort
  }
}
