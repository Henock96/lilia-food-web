import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_VALUE, sessionCookieOptions } from '@/lib/session-cookie';

// Pose / supprime le témoin de session lu par `proxy.ts` (`lib/session-cookie.ts`).
// Ce n'est pas une autorisation : le backend vérifie le jeton Bearer de chaque
// appel. Le corps du `POST` n'est plus lu : les onglets ouverts avant ce
// changement y envoient encore le jeton, qui n'est plus conservé nulle part.

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, SESSION_COOKIE_VALUE, sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
