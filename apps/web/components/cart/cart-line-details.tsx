import type { CartItem } from '@lilia/types';
import { formatCurrency, formatLineOptions } from '@lilia/utils';

/**
 * F3-09 — sous le nom d'un article du panier : ses options, et le problème
 * annoncé par le serveur si la ligne ne passera pas le checkout telle quelle
 * (option en rupture, choix devenu obligatoire…).
 *
 * Le supplément affiché est celui d'une unité ; il est **déjà** compris dans
 * le prix de la ligne, qui vient du serveur (`unitPriceXaf`).
 */
export function CartLineDetails({ item }: { item: CartItem }) {
  const options = item.options ?? [];
  return (
    <>
      {options.length > 0 && (
        <p className="text-xs text-ink-500" data-testid="cart-line-options">
          {formatLineOptions(options, formatCurrency)}
        </p>
      )}
      {item.issue && (
        <p className="mt-0.5 text-xs font-medium text-tomato-700" role="alert">
          {item.issue.message}
        </p>
      )}
    </>
  );
}
