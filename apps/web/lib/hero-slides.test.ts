import { describe, it, expect } from 'vitest';
import type { Restaurant } from '@lilia/types';
import { selectHeroSlides } from './hero-slides';

function vendor(over: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'v1',
    nom: 'Chez Maman Lili',
    adresse: '15, Rue Banziris Poto-Poto',
    phone: '+242000000',
    imageUrl: 'https://res.cloudinary.com/x/cover.jpg',
    latitude: null,
    longitude: null,
    ownerId: 'o1',
    isActive: true,
    isOpen: true,
    manualOverride: false,
    deliveryPriceMode: 'FIXED',
    fixedDeliveryFee: 1000,
    estimatedDeliveryTimeMin: 15,
    estimatedDeliveryTimeMax: 20,
    minimumOrderAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    adminApproved: true,
    ...over,
  } as Restaurant;
}

describe('selectHeroSlides', () => {
  it('retourne un tableau vide quand aucun vendeur', () => {
    expect(selectHeroSlides([])).toEqual([]);
  });

  it('exclut les vendeurs inactifs, non approuvés ou sans photo', () => {
    const list = [
      vendor({ id: 'a', isActive: false }),
      vendor({ id: 'b', adminApproved: false }),
      vendor({ id: 'c', imageUrl: null, photos: [] }),
    ];
    expect(selectHeroSlides(list)).toEqual([]);
  });

  it('retient un vendeur éligible et compose son délai', () => {
    const out = selectHeroSlides([vendor()]);
    expect(out).toHaveLength(1);
    expect(out[0].nom).toBe('Chez Maman Lili');
    expect(out[0].delay).toBe('15–20 min');
    expect(out[0].imageUrl).toBe('https://res.cloudinary.com/x/cover.jpg');
  });

  // La galerie Cloudinary prime sur le champ `imageUrl` hérité, qui pointe
  // souvent vers un hôte tiers non maîtrisé. C'est le comportement de
  // `coverImage()` de @lilia/utils, déjà employé par les cartes vendeur : le
  // hero doit afficher la même image que la carte du même vendeur.
  it('préfère la galerie au champ imageUrl hérité', () => {
    const out = selectHeroSlides([
      vendor({
        imageUrl: 'https://un-site-tiers.example/photo.jpg',
        // `vendor()` accepte déjà Partial<Restaurant> et applique `as Restaurant`
        // en sortie : pas de cast supplémentaire ici. Si le type GalleryImage
        // exige d'autres champs, les compléter plutôt que d'élargir le cast.
        photos: [
          { id: 'p1', url: 'https://res.cloudinary.com/x/grillades.jpg', isCover: true },
        ] as Restaurant['photos'],
      }),
    ]);
    expect(out[0].imageUrl).toBe('https://res.cloudinary.com/x/grillades.jpg');
  });

  it('retombe sur imageUrl quand la galerie est vide', () => {
    const out = selectHeroSlides([
      vendor({ imageUrl: 'https://un-site-tiers.example/photo.jpg', photos: [] }),
    ]);
    expect(out[0].imageUrl).toBe('https://un-site-tiers.example/photo.jpg');
  });

  it('place les vendeurs ouverts avant les fermés', () => {
    const out = selectHeroSlides([
      vendor({ id: 'ferme', isOpen: false }),
      vendor({ id: 'ouvert', isOpen: true }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['ouvert', 'ferme']);
  });

  it('limite à cinq slides', () => {
    const many = Array.from({ length: 9 }, (_, i) => vendor({ id: `v${i}` }));
    expect(selectHeroSlides(many)).toHaveLength(5);
  });
});
