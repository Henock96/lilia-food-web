import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/panier', '/commandes', '/profil'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('firebase-token')?.value;

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !token) {
    const url = new URL('/connexion', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Next.js 16 lit proxy.ts — on réexporte sous le nom middleware pour compatibilité
export { proxy as middleware };

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
