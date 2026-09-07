import { describe, expect, it } from 'vitest';
import type { Category, Product, Restaurant } from '@lilia/types';
import { buildMenuModel, menuItemState, UNCATEGORIZED_LABEL } from './menu-model';

/**
 * Le rangement de la carte, testé sans rendre le composant.
 *
 * Cette logique vivait dans le corps de `RestaurantMenu`, donc hors de portée
 * de tout test. C'est là qu'ont vécu deux défauts : le groupement par nom
 * plutôt que par identifiant (côté Flutter), et un libellé fourre-tout
 * différent d'une plateforme à l'autre.
 */

const cat = (id: string, nom: string, displayOrder = 0): Category =>
  ({ id, nom, displayOrder, isActive: true, createdAt: '', updatedAt: '' }) as Category;

const prod = (id: string, categoryId: string | null, extra: Partial<Product> = {}): Product =>
  ({
    id,
    nom: `Produit ${id}`,
    description: null,
    imageUrl: null,
    prixOriginal: 1000,
    stockQuotidien: null,
    stockRestant: null,
    restaurantId: 'r1',
    categoryId,
    variants: [],
    createdAt: '',
    updatedAt: '',
    ...extra,
  }) as Product;

const resto = (products: Product[], categories: Category[]): Restaurant =>
  ({ id: 'r1', nom: 'Chez Maman Lili', isOpen: true, products, categories }) as Restaurant;

describe('buildMenuModel — rangement de la carte', () => {
  it("respecte l'ordre des sections servi par le serveur", () => {
    // Le serveur trie par `displayOrder` puis `nom`. Le client ne retrie pas :
    // il rendrait un ordre différent de celui que le vendeur a réglé.
    const model = buildMenuModel(
      resto(
        [prod('p1', 'c-boissons'), prod('p2', 'c-plats')],
        [cat('c-plats', 'Plats', 0), cat('c-boissons', 'Boissons', 1)],
      ),
    );

    expect(model.sections.map((s) => s.nom)).toEqual(['Plats', 'Boissons']);
  });

  it('groupe par categoryId, pas par nom', () => {
    // Deux sections de libellés identiques resteraient distinctes. L'application
    // comparait des chaînes : renommer une section en cours de session faisait
    // basculer tous ses produits dans « Autres ».
    const model = buildMenuModel(
      resto(
        [prod('p1', 'c1'), prod('p2', 'c2')],
        [cat('c1', 'Boissons'), cat('c2', 'Boissons')],
      ),
    );

    expect(model.sections).toHaveLength(2);
    expect(model.sections[0]!.products.map((p) => p.id)).toEqual(['p1']);
    expect(model.sections[1]!.products.map((p) => p.id)).toEqual(['p2']);
  });

  it('ne rend pas une section vide', () => {
    // Un vendeur de production déclare 16 sections pour 11 produits : 7 sont
    // vides. Les afficher promettrait un contenu qui n'existe pas.
    const model = buildMenuModel(
      resto([prod('p1', 'c1')], [cat('c1', 'Plats'), cat('c2', 'Desserts')]),
    );

    expect(model.sections.map((s) => s.nom)).toEqual(['Plats']);
  });

  it('range dans « Autres » un produit sans section', () => {
    const model = buildMenuModel(resto([prod('p1', null)], [cat('c1', 'Plats')]));

    expect(model.uncategorized.map((p) => p.id)).toEqual(['p1']);
    expect(UNCATEGORIZED_LABEL).toBe('Autres');
  });

  it('range dans « Autres » un produit dont la section a été désactivée', () => {
    // La section désactivée n'est pas servie par le serveur ; son produit,
    // lui, reste vendable. Il ne doit pas disparaître de la carte.
    const model = buildMenuModel(resto([prod('p1', 'c-desactivee')], [cat('c1', 'Plats')]));

    expect(model.uncategorized.map((p) => p.id)).toEqual(['p1']);
  });

  it('retombe sur les sections dérivées des produits si le serveur n’en fournit pas', () => {
    // Client à jour contre backend antérieur : mieux vaut un ordre imparfait
    // qu'une carte sans sections.
    const p = prod('p1', 'c1');
    p.category = cat('c1', 'Grillades');
    const model = buildMenuModel(resto([p], []));

    expect(model.sections.map((s) => s.nom)).toEqual(['Grillades']);
  });

  it('signale une carte vide', () => {
    expect(buildMenuModel(resto([], [cat('c1', 'Plats')])).isEmpty).toBe(true);
  });

  it('n’oublie aucun produit : sections + « Autres » = tout ce qui a été reçu', () => {
    // Le test qui attrape une carte tronquée par le rangement lui-même.
    const products = [
      prod('p1', 'c1'),
      prod('p2', 'c2'),
      prod('p3', null),
      prod('p4', 'c-inconnue'),
    ];
    const model = buildMenuModel(resto(products, [cat('c1', 'A'), cat('c2', 'B')]));

    const rendus = [
      ...model.sections.flatMap((s) => s.products),
      ...model.uncategorized,
    ].map((p) => p.id);

    expect(rendus.sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('menuItemState — ce que le client peut commander', () => {
  const ouvert = true;

  it('un produit épuisé reste AFFICHÉ, avec son badge, non commandable', () => {
    // C'est le comportement du site, retenu comme canonique : l'application le
    // faisait disparaître, laissant croire que le plat n'était pas au menu.
    expect(menuItemState({ stockRestant: 0 } as Product, ouvert)).toEqual({
      orderable: false,
      badge: 'rupture',
    });
  });

  it('stock illimité (null) n’est PAS « épuisé »', () => {
    // `?? 0` transformerait « illimité » en « épuisé » — le piège classique.
    expect(menuItemState({ stockRestant: null } as Product, ouvert).orderable).toBe(true);
  });

  it('distingue « retiré de la vente » de « épuisé »', () => {
    expect(
      menuItemState({ stockRestant: 5, isAvailable: false } as Product, ouvert),
    ).toEqual({ orderable: false, badge: 'indisponible' });
  });

  it('respecte le verdict horaire du serveur, sans le recalculer', () => {
    expect(
      menuItemState({ stockRestant: null, availableNow: false } as Product, ouvert),
    ).toEqual({ orderable: false, badge: 'indisponible' });
  });

  it('boutique fermée : commandable = non, mais aucun badge produit', () => {
    // La boutique est fermée, pas le produit : le badge mentirait sur la cause.
    expect(menuItemState({ stockRestant: null } as Product, false)).toEqual({
      orderable: false,
      badge: null,
    });
  });

  it('les champs absents valent « disponible » (réponses antérieures)', () => {
    expect(
      menuItemState(
        { stockRestant: null, isAvailable: undefined, availableNow: undefined } as Product,
        ouvert,
      ),
    ).toEqual({ orderable: true, badge: null });
  });
});
