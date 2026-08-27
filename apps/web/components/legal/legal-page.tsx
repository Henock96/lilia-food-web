import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Layout partagé pour les pages légales (CGU, confidentialité, etc.).
 * Fournit un en-tête cohérent, la navigation retour et le style typo
 * adapté à la lecture de documents juridiques longs.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Retour */}
        <Link
          href="/support"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-tomato-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au support
        </Link>

        {/* En-tête */}
        <header className="mb-10 border-b border-ink-100 pb-6">
          <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            Dernière mise à jour : {lastUpdated}
          </p>
        </header>

        {/* Contenu */}
        <article className="prose prose-ink max-w-none text-sm leading-relaxed prose-headings:font-display prose-headings:font-extrabold prose-h2:mt-10 prose-h2:text-xl prose-h2:text-ink-900 prose-h3:mt-6 prose-h3:text-base prose-h3:text-ink-900 prose-p:text-ink-700 prose-li:text-ink-700 prose-strong:text-ink-900 prose-a:text-tomato-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-tomato-500 prose-blockquote:text-ink-500 prose-table:text-sm prose-th:text-left prose-th:font-bold prose-th:text-ink-900 prose-td:text-ink-700">
          {children}
        </article>

        {/* Bas de page */}
        <div className="mt-12 border-t border-ink-100 pt-6 text-center text-xs text-ink-400">
          <p>
            © {new Date().getFullYear()} Lilia Food SARL. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
