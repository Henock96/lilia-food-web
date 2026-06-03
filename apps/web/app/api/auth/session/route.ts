import { NextRequest, NextResponse } from 'next/server';

// Pose / supprime le cookie de session `firebase-token` en HttpOnly + Secure,
// côté serveur. Empêche le vol de session par XSS (le JS client ne peut plus
// lire le token via document.cookie). Le cookie sert de gate de présence pour
// `proxy.ts` ; l'autorisation réelle reste la vérification du Bearer token par
// le backend.

const COOKIE_NAME = 'firebase-token';
const MAX_AGE = 3600; // 1h — aligné sur l'expiration du token Firebase

export async function POST(request: NextRequest) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
