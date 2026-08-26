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
    expect(out[0].adresse).toBe('15, Rue Banziris Poto-Poto');
    expect(out[0].isOpen).toBe(true);
  });

  // Les vendeurs créés avant le workflow d'approbation (LIL-111) n'ont pas de
  // valeur pour `adminApproved` : `undefined` doit être traité comme approuvé,
  // pas comme rejeté. Ce test verrouille le comportement de `!== false` :
  // si quelqu'un resserre un jour ce filtre en `=== true`, ce test échoue au
  // lieu de vider silencieusement le hero en production.
  it('retient un vendeur dont adminApproved est indéfini', () => {
    const out = selectHeroSlides([vendor({ adminApproved: undefined })]);
    expect(out).toHaveLength(1);
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

  it('limite à cinq slides et conserve les cinq premiers dans l’ordre', () => {
    const many = Array.from({ length: 9 }, (_, i) => vendor({ id: `v${i}` }));
    const out = selectHeroSlides(many);
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.id)).toEqual(['v0', 'v1', 'v2', 'v3', 'v4']);
  });

  // Le tri par ouverture doit s'appliquer avant le plafond à cinq : un
  // vendeur fermé ne doit jamais prendre la place d'un vendeur ouvert, même
  // s'il apparaît avant lui dans la liste d'origine.
  it('les vendeurs ouverts passent devant avant que le plafond ne s’applique', () => {
    const list = [
      vendor({ id: 'ferme1', isOpen: false }),
      vendor({ id: 'ferme2', isOpen: false }),
      vendor({ id: 'ferme3', isOpen: false }),
      vendor({ id: 'ouvert1', isOpen: true }),
      vendor({ id: 'ouvert2', isOpen: true }),
      vendor({ id: 'ouvert3', isOpen: true }),
      vendor({ id: 'ouvert4', isOpen: true }),
      vendor({ id: 'ouvert5', isOpen: true }),
      vendor({ id: 'ouvert6', isOpen: true }),
    ];
    const out = selectHeroSlides(list);
    expect(out).toHaveLength(5);
    expect(out.every((s) => s.isOpen)).toBe(true);
    expect(out.map((s) => s.id)).toEqual([
      'ouvert1',
      'ouvert2',
      'ouvert3',
      'ouvert4',
      'ouvert5',
    ]);
  });
});
