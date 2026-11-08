import { Store } from 'lucide-react';

/**
 * En-tête d'une carte de commande : le vendeur d'abord, puis numéro et date.
 *
 * Les commandes de toutes les boutiques défilent dans la même liste : sans le
 * vendeur en tête, l'admin confondait les restaurants.
 */
export function OrderCardIdentity({
  vendorName,
  orderId,
  createdAt,
}: {
  vendorName: string | null | undefined;
  orderId: string;
  createdAt: string;
}) {
  return (
    <div className="min-w-0">
      {vendorName && (
        <p className="flex items-center gap-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
          <Store size={16} className="shrink-0 text-primary-500" aria-hidden />
          <span className="truncate">{vendorName}</span>
        </p>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          #{orderId.slice(-8).toUpperCase()}
        </span>
        {' · '}
        {new Date(createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

/**
 * Instructions du client, hors du détail replié : c'est ce que la cuisine doit
 * lire avant de préparer. Elles étaient en petit gris italique, dépliage requis.
 */
export function CustomerInstructions({ notes }: { notes: string | null | undefined }) {
  if (!notes?.trim()) return null;
  return (
    <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Instructions du client
      </p>
      <p className="mt-0.5 whitespace-pre-line break-words text-sm text-amber-950 dark:text-amber-100">
        {notes}
      </p>
    </div>
  );
}
