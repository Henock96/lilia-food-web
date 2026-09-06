import { CalendarClock, Clock, Leaf, Package } from 'lucide-react';
import type { Product, ProductVendorRef } from '@lilia/types';
import { availabilityWindowLabel } from '@/lib/availability';

/**
 * Caractéristiques d'un produit : ce que la liste du menu ne montre pas.
 *
 * C'est la raison d'être de la fiche. Dans la carte du vendeur, la description
 * est tronquée à deux lignes et les ingrédients, la durée de conservation et le
 * délai de précommande n'apparaissent nulle part — alors qu'ils décident de
 * l'achat pour une cuisine maison ou une pâtisserie.
 *
 * Composant **serveur** : rien ici ne réagit au clic, rien n'a à peser dans le
 * bundle envoyé au navigateur.
 */
export function ProductFacts({
  product,
  vendor,
}: {
  product: Product;
  vendor: ProductVendorRef | null;
}) {
  const window = availabilityWindowLabel(product);
  const leadHours = vendor?.preorderLeadHours ?? null;

  const facts = [
    product.ingredients?.trim()
      ? { icon: Leaf, label: 'Ingrédients', value: product.ingredients.trim() }
      : null,
    product.shelfLifeDays != null
      ? {
          icon: Package,
          label: 'Se conserve',
          value: `${product.shelfLifeDays} jour${product.shelfLifeDays > 1 ? 's' : ''}`,
        }
      : null,
    window ? { icon: Clock, label: 'Horaires de vente', value: window } : null,
  ].filter((f): f is { icon: typeof Leaf; label: string; value: string } => f !== null);

  const hasPreorder = product.madeToOrder === true;

  if (facts.length === 0 && !hasPreorder) return null;

  return (
    <section className="flex flex-col gap-4" aria-label="Caractéristiques du produit">
      {/* La précommande change la nature de l'achat : le client ne repart pas
          avec son plat, il réserve un créneau. Le dire en évidence, et pas dans
          une liste de détails. */}
      {hasPreorder && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-800">Préparé sur commande</p>
            <p className="mt-0.5 text-xs leading-relaxed text-orange-700">
              {leadHours
                ? `Ce produit demande ${leadHours} h de préavis. Vous choisirez votre créneau de retrait au moment de commander.`
                : 'Vous choisirez votre créneau de retrait au moment de commander.'}
              {' '}Un panier ne peut pas mélanger des produits sur commande et des produits immédiats.
            </p>
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <dl className="flex flex-col divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3 p-4">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs font-medium text-ink-500">{label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink-900">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
