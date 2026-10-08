/**
 * Cadrage d'une image de vendeur dans une vignette paysage.
 *
 * Les vendeurs téléversent souvent leur **logo** comme photo de couverture
 * (6 sur 9 en production le 08/10/2026 : cinq carrés, un bandeau 3:1).
 * `object-cover` les rognait — « Le first » sans son « Restaurant », « Dynasty »
 * coupé aux deux bouts. Une vraie photo, elle, est presque toujours un
 * paysage modéré (1,34 et 1,5 mesurés) que `cover` remplit proprement.
 *
 * Heuristique d'**affichage** seulement, sur les dimensions réelles de
 * l'image chargée : paysage modéré → `cover` ; carré, portrait ou bandeau →
 * `contain` sur fond neutre, l'image entière reste lisible.
 */
export type CoverFit = 'cover' | 'contain';

export function coverFit(width: number, height: number): CoverFit {
  if (!(width > 0) || !(height > 0)) return 'cover';
  const ratio = width / height;
  return ratio >= 1.2 && ratio <= 2 ? 'cover' : 'contain';
}
