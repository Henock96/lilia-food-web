import { type NextRequest, NextResponse } from 'next/server';

// Toutes les routes sont protégées sauf l'authentification. La présence du
// cookie `firebase-token` (HttpOnly, posé par /api/auth/session) est vérifiée
// côté serveur AVANT le rendu — defense-in-depth en plus du gating client
// (`(protected)/layout.tsx`). Le rôle ADMIN/RESTAURATEUR reste vérifié côté
// client + backend (le cookie ne sert qu'à la présence de session).
const PUBLIC_PATHS = ['/connexion'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('firebase-token')?.value;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isPublic && !token) {
    const url = new URL('/connexion', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Next.js 16 lit proxy.ts — on réexporte sous le nom middleware pour compatibilité
export { proxy as middleware };

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
