'use client';

import { Zap } from 'lucide-react';
import { formatCurrency } from '@lilia/utils';

/**
 * Utilisation des points au checkout.
 *
 * Le solde converti en argent (`points × valeur`) annonçait une réduction que
 * le serveur ne donne pas : il plafonne les points au montant dû. Une fois
 * activés, seule la réduction du devis est affichée ; avant, la valeur d'un
 * point. Aucun plafond n'est recalculé ici (le serveur décide).
 */
export function LoyaltyToggle({
  points,
  pointValueXaf,
  active,
  discountXaf,
  pointsUsed,
  onToggle,
}: {
  points: number;
  pointValueXaf: number;
  active: boolean;
  /** Réduction du devis serveur ; `null` tant qu'il n'est pas là. */
  discountXaf: number | null;
  pointsUsed: number | null;
  onToggle: () => void;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-600" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {points} {points > 1 ? 'points disponibles' : 'point disponible'}
          </p>
          <p className="text-xs text-warning">
            {!active
              ? `1 point = ${formatCurrency(pointValueXaf)}`
              : discountXaf !== null && pointsUsed !== null
                ? `${pointsUsed} ${pointsUsed > 1 ? 'points utilisés' : 'point utilisé'} : -${formatCurrency(discountXaf)}`
                : 'Réduction calculée au récapitulatif'}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Utiliser mes points fidélité"
        onClick={onToggle}
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${active ? 'bg-amber-500' : 'bg-cream-300'}`}
      >
        <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
