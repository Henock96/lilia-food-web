'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-zinc-50 dark:bg-dark-bg flex items-center justify-center px-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-8">
            <svg viewBox="0 0 200 200" className="w-44 h-44" fill="none" aria-hidden>
              <circle cx="100" cy="100" r="90" fill="#fff1f2" />
              {/* Flamme / erreur */}
              <path d="M100 55 C85 70 75 85 80 100 C82 107 88 112 95 110 C90 103 92 95 100 90 C108 95 110 103 105 110 C112 112 118 107 120 100 C125 85 115 70 100 55Z" fill="#f43f5e" opacity="0.8" />
              <path d="M100 72 C92 82 88 90 92 99 C94 104 97 106 100 104 C103 106 106 104 108 99 C112 90 108 82 100 72Z" fill="#fbbf24" />
              {/* Motif */}
              <circle cx="40" cy="40" r="5" fill="#f43f5e" opacity="0.2" />
              <circle cx="160" cy="40" r="5" fill="#f43f5e" opacity="0.2" />
              <circle cx="40" cy="160" r="5" fill="#f43f5e" opacity="0.2" />
              <circle cx="160" cy="160" r="5" fill="#f43f5e" opacity="0.2" />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-danger mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Oups !
          </h1>
          <h2 className="text-xl font-bold text-zinc-800 mb-3">
            Une erreur est survenue
          </h2>
          <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
            Quelque chose s'est mal passé de notre côté. Nos équipes sont sur le coup.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-primary-200/50"
            >
              Réessayer
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-white border border-zinc-200 text-zinc-700 font-semibold rounded-2xl hover:bg-zinc-50 transition-all"
            >
              Accueil
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
