import type { Restaurant } from '@lilia/types';
import { cn } from '@lilia/utils';
import { VendorCard } from './vendor-card';

/**
 * Grille de vendeurs — accueil et catalogue.
 *
 * Elle **dispose** les cartes qu'on lui donne et n'en décide jamais le nombre :
 * 2 vendeurs = 2 cartes, 7 = 7. Plus d'emplacements « Prochain vendeur ici »
 * pour remplir une rangée : ils servaient à masquer qu'une grille de 4 cases
 * n'affichait qu'un vendeur, et faisaient ensuite croire, à 9 vendeurs, qu'il
 * en manquait.
 *
 * Plus d'apparition échelonnée non plus (Framer Motion) : une animation
 * d'entrée sur chaque carte retardait l'affichage de ce que le visiteur est
 * venu voir, sans rien lui apprendre.
 */
export const VENDOR_GRID_CLASSNAME =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4';

export function VendorGrid({
  vendors,
  className,
}: {
  vendors: Restaurant[];
  className?: string;
}) {
  return (
    <ul role="list" className={cn(VENDOR_GRID_CLASSNAME, className)}>
      {vendors.map((v) => (
        <li key={v.id}>
          <VendorCard restaurant={v} />
        </li>
      ))}
    </ul>
  );
}
