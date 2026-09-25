import { describe, expect, it } from 'vitest';
import { modifierPaths } from './modifiers';

/**
 * F3-09 — chemins de l'éditeur d'options, alignés sur `ModifiersController`
 * (`@Controller('products/manage')`). Un chemin faux répondrait 404 — ou pire,
 * serait capturé par `/products/:id`.
 */
describe('modifierPaths', () => {
  it('bibliothèque : restaurantId seulement pour un ADMIN', () => {
    expect(modifierPaths.library()).toBe('/products/manage/modifier-groups');
    expect(modifierPaths.library('r 1')).toBe('/products/manage/modifier-groups?restaurantId=r%201');
  });

  it('écritures', () => {
    expect(modifierPaths.group('g1')).toBe('/products/manage/modifier-groups/g1');
    expect(modifierPaths.groupDelete('g1', 'r1')).toBe('/products/manage/modifier-groups/g1?restaurantId=r1');
    expect(modifierPaths.reorder()).toBe('/products/manage/modifier-groups/reorder');
    expect(modifierPaths.availability('o1')).toBe('/products/manage/modifier-options/o1/availability');
    expect(modifierPaths.productGroups('p1')).toBe('/products/manage/p1/modifier-groups');
  });
});
