'use client';

import { ArrowDown, ArrowUp, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useSetVendorDisplayOrder, useSetVendorFeatured } from '@lilia/api-client';

import { useAuthStore } from '@/store/auth';

/**
 * Classement et mise en avant d'un vendeur.
 *
 * **Deux boutons ↑ ↓, pas de glisser-déposer.** Le catalogue compte une poignée
 * de vendeurs ; un drag & drop demanderait une librairie, une gestion tactile,
 * un état optimiste et un endpoint de réordonnancement en lot, là où deux
 * boutons demandent un `PATCH`. À revoir si la liste dépasse la trentaine — ce
 * sera un problème agréable à avoir.
 *
 * ⚠️ Aucun de ces gestes ne **publie** quoi que ce soit. Un vendeur en
 * brouillon classé premier et mis en avant reste invisible des clients : la
 * visibilité est une clause `where`, le classement une clause `orderBy`.
 */
export function ShowcaseControls({
  vendorId,
  displayOrder,
  isFeatured,
}: {
  vendorId: string;
  displayOrder: number;
  isFeatured: boolean;
}) {
  const { token } = useAuthStore();
  const setOrder = useSetVendorDisplayOrder(token);
  const setFeatured = useSetVendorFeatured(token);

  /**
   * Le pas de 1 suffit tant que les positions sont contiguës. Sur un vendeur
   * encore au défaut (1000), « monter » l'amène à 1 : c'est le geste voulu —
   * on le sort de la file des non-classés pour le mettre devant.
   */
  async function move(delta: number) {
    const next =
      displayOrder >= 1000 && delta < 0 ? 1 : Math.min(9999, Math.max(1, displayOrder + delta));
    if (next === displayOrder) return;
    try {
      await setOrder.mutateAsync({ id: vendorId, displayOrder: next });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleFeatured() {
    try {
      const r = await setFeatured.mutateAsync({ id: vendorId, isFeatured: !isFeatured });
      toast.success(
        isFeatured ? 'Retiré des vendeurs en avant.' : 'Ajouté aux vendeurs en avant.',
      );
      return r;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const busy = setOrder.isPending || setFeatured.isPending;

  return (
    <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-3 dark:border-dark-border">
      <button
        onClick={() => move(-1)}
        disabled={busy || displayOrder <= 1}
        title="Monter dans la liste des clients"
        aria-label="Monter"
        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-zinc-800"
      >
        <ArrowUp size={13} />
      </button>
      <button
        onClick={() => move(1)}
        disabled={busy || displayOrder >= 9999}
        title="Descendre dans la liste des clients"
        aria-label="Descendre"
        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-zinc-800"
      >
        <ArrowDown size={13} />
      </button>

      <span className="text-xs tabular-nums text-zinc-400">
        {displayOrder >= 1000 ? 'non classé' : `position ${displayOrder}`}
      </span>

      <button
        onClick={toggleFeatured}
        disabled={busy}
        title={
          isFeatured
            ? 'Retirer de la section « Les plus courus »'
            : 'Mettre en avant sur la page d’accueil'
        }
        className={`ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
          isFeatured
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400'
            : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-dark-border dark:hover:bg-zinc-800'
        }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Star size={13} className={isFeatured ? 'fill-amber-500' : ''} />
        )}
        {isFeatured ? 'En vedette' : 'Mettre en avant'}
      </button>
    </div>
  );
}
