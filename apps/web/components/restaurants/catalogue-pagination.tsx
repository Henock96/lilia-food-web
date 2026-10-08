import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { catalogueHref, type CatalogueParams } from '@/lib/vendor-catalog';

/**
 * Pagination du catalogue : de vrais liens (`?page=N`), donc partageables,
 * indexables et utilisables sans JavaScript. Rien n'est rendu sur une seule
 * page.
 */
export function CataloguePagination({
  params,
  page,
  totalPages,
}: {
  params: CatalogueParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const linkClass =
    'inline-flex min-h-11 items-center gap-1.5 rounded-pill border-[1.5px] border-cream-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-tomato-600 hover:text-tomato-700';

  return (
    <nav aria-label="Pages du catalogue" className="mt-10 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={catalogueHref(params, { page: page - 1 })} className={linkClass} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Précédente
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-ink-500" aria-current="page">
        Page {page} sur {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={catalogueHref(params, { page: page + 1 })} className={linkClass} rel="next">
          Suivante
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
