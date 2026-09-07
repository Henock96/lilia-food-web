import { describe, expect, it } from 'vitest';
import { priceLabel, startingPrice } from '@lilia/utils';

/**
 * **La règle de prix du catalogue, testée une fois pour le site.**
 *
 * Trois définitions concurrentes cohabitaient pour la même notion :
 * `variants[0].prix` sur la ligne de menu, `Math.min(variants)` sur la fiche
 * produit, `variants.first.prix` côté application. Le site était donc
 * incohérent **avec lui-même** : pour un plat à trois tailles, sa carte pouvait
 * annoncer 1 500 XAF et sa fiche 1 000 XAF.
 *
 * ⚠️ Le même tableau de cas est joué côté Flutter
 * (`lilia-app/test/models/price_rule_test.dart`). Les deux plateformes peuvent
 * différer d'apparence, pas de vérité métier.
 */
const produit = (variants: number[], prixOriginal = 9999) => ({
  prixOriginal,
  variants: variants.map((prix, i) => ({ id: `v${i}`, prix })),
});

describe('startingPrice — le prix d’appel', () => {
  it('prend le moins cher, quel que soit l’ordre reçu', () => {
    // Le point capital : l'ordre des variantes n'a longtemps PAS été garanti
    // (18 `include` sans `orderBy` côté backend). Un « premier » élément ne
    // pouvait donc pas servir de prix affiché.
    expect(startingPrice(produit([3500, 2500, 4500]))).toBe(2500);
    expect(startingPrice(produit([2500, 3500, 4500]))).toBe(2500);
    expect(startingPrice(produit([4500, 3500, 2500]))).toBe(2500);
  });

  it('une seule variante → son prix', () => {
    expect(startingPrice(produit([2500]))).toBe(2500);
  });

  it('aucune variante → le prix du produit', () => {
    expect(startingPrice(produit([], 1800))).toBe(1800);
  });

  it('ignore les variantes à 0 ou négatives plutôt que d’afficher « gratuit »', () => {
    expect(startingPrice(produit([0, 2500]))).toBe(2500);
    expect(startingPrice(produit([-100, 2500]))).toBe(2500);
  });

  it('des variantes toutes invalides retombent sur le prix du produit', () => {
    expect(startingPrice(produit([0, 0], 1500))).toBe(1500);
  });
});

describe('priceLabel — ce que lit le client', () => {
  it('plusieurs prix distincts → « À partir de »', () => {
    // Annoncer le prix d'un format sans dire lequel est une promesse qu'on ne
    // tient pas au panier.
    expect(priceLabel(produit([2500, 3500]))).toMatch(/^À partir de /);
    // ⚠️ Le séparateur de milliers d'`Intl` fr-FR est une **espace fine
    // insécable** (U+202F), pas une espace ordinaire. Le repérer ici évite de
    // « corriger » plus tard un test qui semblerait faux à l'œil nu — et c'est
    // ce même caractère que le portage Dart doit produire.
    expect(priceLabel(produit([2500, 3500]))).toContain('2\u202f500');
  });

  it('un seul format → son prix, sans « À partir de »', () => {
    expect(priceLabel(produit([2500]))).not.toMatch(/À partir de/);
  });

  it('plusieurs formats au MÊME prix → pas de « à partir de »', () => {
    // « Rouge » et « Bleu » à 2 500 : il n'y a pas de fourchette à annoncer.
    expect(priceLabel(produit([2500, 2500]))).not.toMatch(/À partir de/);
  });

  /**
   * ⚠️ **La devise s'écrit « FCFA », pas « XAF », sur les surfaces client.**
   *
   * `Intl.NumberFormat('fr-FR', { currency: 'XAF' })` rend « 2 500 FCFA » : ce
   * que le site affiche depuis toujours. L'application Flutter, elle, écrivait
   * « 2 500 XAF » (`utils/currency.dart`), avec un commentaire affirmant
   * l'alignement sur le backend — or le backend écrit **FCFA** dans les SMS et
   * les push que le client lit réellement.
   *
   * Les deux surfaces vues par le même acheteur se contredisaient donc. On
   * retient FCFA : c'est ce qui est déjà affiché à tous les utilisateurs du
   * site, l'usage courant à Brazzaville, et le mot du backend. « XAF » reste le
   * code ISO, employé dans les back-offices et les messages de validation —
   * deux publics différents, deux vocabulaires assumés.
   */
  it('exprime les montants en FCFA sans décimale — le franc CFA n’en a pas', () => {
    const label = priceLabel(produit([2500]));
    expect(label).not.toContain(',');
    expect(label).not.toContain('.0');
    expect(label).toContain('FCFA');
    expect(label).toContain('2\u202f500');
  });
});
