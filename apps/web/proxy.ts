import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_VALUE, sessionCookieOptions } from '@/lib/session-cookie';

const PROTECTED_PATHS = ['/panier', '/commandes', '/profil', '/demandes'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const marker = request.cookies.get(SESSION_COOKIE)?.value;

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !marker) {
    const url = new URL('/connexion', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Transition SEC-07 : un cookie posé avant le témoin porte encore le jeton
  // Firebase, en `HttpOnly`. Sa présence vaut toujours session ouverte ; on ne
  // garde que le témoin, lisible par le client.
  if (marker && marker !== SESSION_COOKIE_VALUE) {
    res.cookies.set(SESSION_COOKIE, SESSION_COOKIE_VALUE, sessionCookieOptions());
  }
  return res;
}

// Next.js 16 lit proxy.ts — on réexporte sous le nom middleware pour compatibilité
export { proxy as middleware };

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
