import { describe, expect, it } from 'vitest';
import type { CartItem, ModifierGroup } from '@lilia/types';
import {
  cartLineUnitPrice,
  cartSubtotal,
  formatLineOptions,
  modifierBlockingReason,
  selectedOptionsCount,
  selectedOptionsValue,
  setModifierQuantity,
  toSelectedOptions,
  toggleModifier,
  type ModifierSelection,
} from '@lilia/utils';
import { computePurchaseState } from './product-purchase-state';
import { menuItemState } from './menu-model';

/**
 * F3-09 — options & suppléments côté site : montants serveur, sélection
 * (ergonomie) et état d'achat.
 */
const accompagnement: ModifierGroup = {
  id: 'g-acc',
  name: 'Accompagnement',
  minSelect: 1,
  maxSelect: 1,
  required: true,
  options: [
    { id: 'alloco', name: 'Alloco', priceDeltaXaf: 500, maxQuantity: 1, isAvailable: true },
    { id: 'frites', name: 'Frites', priceDeltaXaf: 0, maxQuantity: 1, isAvailable: true },
    { id: 'riz', name: 'Riz', priceDeltaXaf: 0, maxQuantity: 1, isAvailable: false },
  ],
};
const supplements: ModifierGroup = {
  id: 'g-sup',
  name: 'Suppléments',
  minSelect: 0,
  maxSelect: 2,
  required: false,
  options: [
    { id: 'oeuf', name: 'Œuf', priceDeltaXaf: 300, maxQuantity: 3, isAvailable: true },
    { id: 'fromage', name: 'Fromage', priceDeltaXaf: 500, maxQuantity: 1, isAvailable: true },
    { id: 'piment', name: 'Piment', priceDeltaXaf: 0, maxQuantity: 1, isAvailable: true },
  ],
};
const groups = [accompagnement, supplements];

function line(overrides: Partial<CartItem>): CartItem {
  return {
    id: 'l1',
    cartId: 'c',
    productId: 'p',
    menuId: null,
    variantId: 'v',
    quantite: 1,
    itemKey: null,
    createdAt: '2026-09-26',
    variant: { id: 'v', label: 'Standard', prix: 3000, productId: 'p', createdAt: '', updatedAt: '' },
    ...overrides,
  };
}

describe('montants du panier — le serveur fait foi', () => {
  it('prix unitaire : celui du serveur, même s’il diffère du catalogue', () => {
    expect(cartLineUnitPrice(line({ unitPriceXaf: 3900 }))).toBe(3900);
  });

  it('repli (serveur antérieur) : variante + options', () => {
    expect(
      cartLineUnitPrice(
        line({
          options: [
            { optionId: 'alloco', groupId: 'g', groupName: 'A', name: 'Alloco', priceDeltaXaf: 500, quantity: 1 },
            { optionId: 'oeuf', groupId: 'g', groupName: 'S', name: 'Œuf', priceDeltaXaf: 300, quantity: 2 },
          ],
        }),
      ),
    ).toBe(4100);
  });

  it('sous-total : subTotalXaf du serveur quand il est servi', () => {
    expect(cartSubtotal({ items: [line({ quantite: 2 })], subTotalXaf: 7600 })).toBe(7600);
  });

  it('repli : un menu compte une fois, à son prix — pas produit par produit', () => {
    const menu = { id: 'm', nom: 'Menu', prix: 4000 } as CartItem['menu'];
    const items = [
      line({ id: 'a', menuId: 'm', menu, quantite: 2 }),
      line({ id: 'b', menuId: 'm', menu, quantite: 2 }),
      line({ id: 'c', quantite: 1, unitPriceXaf: 3800 }),
    ];
    expect(cartSubtotal({ items })).toBe(8000 + 3800);
  });

  it('libellé des options : supplément de la ligne, jamais additionné au prix', () => {
    expect(
      formatLineOptions(
        [
          { name: 'Alloco', priceDeltaXaf: 0, quantity: 1 },
          { optionName: 'Œuf', priceDeltaXaf: 300, quantity: 2 },
        ],
        (n) => `${n} F`,
      ),
    ).toBe('Alloco · Œuf ×2 (+600 F)');
  });
});

describe('sélection d’options (ergonomie)', () => {
  it('groupe obligatoire vide : bouton bloqué, et dit lequel', () => {
    expect(modifierBlockingReason(groups, {})).toBe('Choisissez « Accompagnement »');
    const s = toggleModifier({}, accompagnement, accompagnement.options[0])!;
    expect(modifierBlockingReason(groups, s)).toBeNull();
  });

  it('radio : choisir remplace ; un choix obligatoire ne se décoche pas', () => {
    let s: ModifierSelection = toggleModifier({}, accompagnement, accompagnement.options[0])!;
    s = toggleModifier(s, accompagnement, accompagnement.options[1])!;
    expect(s).toEqual({ frites: 1 });
    expect(toggleModifier(s, accompagnement, accompagnement.options[1])).toEqual({ frites: 1 });
  });

  it('option épuisée refusée ; plafond en options DISTINCTES', () => {
    expect(toggleModifier({}, accompagnement, accompagnement.options[2])).toBeNull();
    let s: ModifierSelection = toggleModifier({}, supplements, supplements.options[0])!;
    s = setModifierQuantity(s, supplements.options[0], 3);
    s = toggleModifier(s, supplements, supplements.options[1])!;
    expect(toggleModifier(s, supplements, supplements.options[2])).toBeNull();
    expect(s).toEqual({ oeuf: 3, fromage: 1 });
  });

  it('quantité bornée ; ce qui part au serveur ; valeur et compte', () => {
    let s: ModifierSelection = { alloco: 1 };
    s = toggleModifier(s, supplements, supplements.options[0])!;
    s = setModifierQuantity(s, supplements.options[0], 9);
    expect(s.oeuf).toBe(3);
    expect(toSelectedOptions(groups, s)).toEqual([
      { optionId: 'alloco', quantity: 1 },
      { optionId: 'oeuf', quantity: 3 },
    ]);
    expect(selectedOptionsValue(groups, s)).toBe(500 + 900);
    expect(selectedOptionsCount(s)).toBe(4);
  });
});

describe('état d’achat — verdict du serveur sur les options', () => {
  const product = {
    variants: [{ id: 'v', label: null, prix: 3000, productId: 'p', createdAt: '', updatedAt: '' }],
    stockRestant: null,
    isAvailable: true,
    availableNow: true,
    availableFrom: null,
    availableUntil: null,
  };

  it('plus aucun choix vendable : non commandable, avec la raison du serveur', () => {
    const reason = '« Poulet braisé » est indisponible : plus aucun choix pour « Accompagnement ».';
    const state = computePurchaseState({ ...product, modifiersUnavailableReason: reason }, { isOpen: true });
    expect(state).toMatchObject({ canAdd: false, blocker: 'options_unavailable', message: reason });
    expect(menuItemState({ ...product, modifiersUnavailableReason: reason }, true)).toEqual({
      orderable: false,
      badge: 'indisponible',
    });
  });

  it('sans verdict (réponse antérieure) : commandable', () => {
    expect(computePurchaseState(product, { isOpen: true }).canAdd).toBe(true);
  });
});
