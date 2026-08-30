import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// Les pages de connexion et d'inscription sont des formulaires : elles
// n'apportent rien dans l'index et diluaient le budget de crawl (elles
// figuraient même dans le sitemap). Les pages étant `'use client'`, le
// `noindex` se pose ici, au niveau du layout, qui est un Server Component.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50/30 flex flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit" aria-label="Lilia Food — Accueil">
          {/* Le vrai logo, et non une icône générique : c'est l'écran où l'on
              demande un mot de passe, celui où la marque doit être reconnue. */}
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <Image src="/logo.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" />
          </span>
          <span className="font-bold text-lg text-ink-900" style={{ fontFamily: 'var(--font-display)' }}>
            Lilia Food
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
