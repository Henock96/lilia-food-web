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
    <div className="flex min-h-screen flex-col bg-[#faf7f2]">
      <header className="border-ink-100 border-b bg-white">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex w-fit items-center gap-2"
            aria-label="Lilia Food — Accueil"
          >
            {/* Le vrai logo, et non une icône générique : c'est l'écran où l'on
              demande un mot de passe, celui où la marque doit être reconnue. */}
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <Image
                src="/logo.jpg"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="font-display text-ink-900 text-xl font-extrabold tracking-tight">
              Lilia<span className="text-tomato-600"> Food</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
