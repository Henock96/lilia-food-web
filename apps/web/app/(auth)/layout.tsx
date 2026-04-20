import { Suspense } from 'react';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50/30 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit" aria-label="Lilia Food — Accueil">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
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
