import { Tag } from 'lucide-react';
import type { ActiveOffer } from '@lilia/types';
import { cn } from '@lilia/utils';
import { offerShortLabel } from '@/lib/offer-label';

/**
 * Badge d'une offre boutique (F3-11), financée par le vendeur et appliquée
 * d'elle-même au panier. `expanded` affiche le libellé complet du serveur.
 * Affichage seulement : le montant d'une commande vient du devis serveur.
 */
export function OfferBadge({
  offer,
  expanded = false,
  className,
}: {
  offer: ActiveOffer;
  expanded?: boolean;
  className?: string;
}) {
  const text = expanded && offer.label ? offer.label : offerShortLabel(offer);
  return (
    <span
      data-testid="offer-badge"
      title={offer.label || undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-tomato-600 px-2.5 py-1 text-[11px] font-bold text-white',
        className,
      )}
    >
      <Tag className="h-3 w-3" aria-hidden />
      {text}
    </span>
  );
}
