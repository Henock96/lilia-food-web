import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page introuvable',
  description: 'Cette page n\'existe pas.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-dark-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Illustration SVG afro */}
        <div className="flex justify-center mb-8">
          <svg viewBox="0 0 200 200" className="w-48 h-48" fill="none" aria-hidden>
            <circle cx="100" cy="100" r="90" fill="#fff7ed" className="dark:fill-dark-card" />
            {/* Assiette vide */}
            <ellipse cx="100" cy="120" rx="55" ry="12" fill="#fed7aa" opacity="0.6" />
            <circle cx="100" cy="100" r="42" fill="#ffedd5" stroke="#fdba74" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="30" fill="#fff7ed" stroke="#fdba74" strokeWidth="1.5" />
            {/* Fourchette */}
            <rect x="86" y="62" width="3" height="28" rx="1.5" fill="#fb923c" />
            <rect x="83" y="62" width="2" height="12" rx="1" fill="#fb923c" />
            <rect x="89" y="62" width="2" height="12" rx="1" fill="#fb923c" />
            {/* Couteau */}
            <rect x="111" y="62" width="3" height="28" rx="1.5" fill="#fb923c" />
            <path d="M111 62 Q117 66 114 74 L111 74 Z" fill="#f97316" />
            {/* Point d'interrogation stylisé */}
            <text x="100" y="110" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#f97316" fontFamily="Georgia, serif">?</text>
            {/* Motif géométrique africain */}
            <circle cx="30" cy="30" r="6" fill="#fb923c" opacity="0.3" />
            <circle cx="170" cy="30" r="6" fill="#fb923c" opacity="0.3" />
            <circle cx="30" cy="170" r="6" fill="#fb923c" opacity="0.3" />
            <circle cx="170" cy="170" r="6" fill="#fb923c" opacity="0.3" />
            <rect x="26" y="26" width="8" height="8" rx="1" fill="none" stroke="#fb923c" strokeWidth="1" opacity="0.5" transform="rotate(45 30 30)" />
          </svg>
        </div>

        <h1 className="text-6xl font-black text-primary-500 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          404
        </h1>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-3">
          Plat introuvable
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Cette page n'est pas au menu. Elle a peut-être été retirée ou l'adresse est incorrecte.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-primary-200/50 hover:-translate-y-0.5 active:translate-y-0"
          >
            Retour à l'accueil
          </Link>
          <Link
            href="/restaurants"
            className="px-6 py-3 bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-700 dark:text-zinc-200 font-semibold rounded-2xl hover:bg-zinc-50 dark:hover:bg-dark-surface transition-all hover:-translate-y-0.5"
          >
            Voir les restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}
