import { describe, expect, it } from 'vitest';
import { isForbiddenKey, looksLikePii, sanitizeParams } from './sanitize';
import { EVENT_PARAMS, FUNNEL_EVENTS, MAX_STRING_LENGTH } from './contract';

describe('liste blanche', () => {
  it('laisse passer les paramètres du contrat', () => {
    const { params } = sanitizeParams('add_to_cart', {
      product_id: 'p1',
      product_name: 'Poulet braisé',
      restaurant_id: 'r1',
      price: 3500,
      quantity: 2,
    });
    expect(params).toEqual({
      product_id: 'p1',
      product_name: 'Poulet braisé',
      restaurant_id: 'r1',
      price: 3500,
      quantity: 2,
    });
  });

  it('retire tout paramètre non déclaré, même anodin', () => {
    const { params, dropped } = sanitizeParams('view_cart', {
      item_count: 3,
      cart_total: 12000,
      vendor_type: 'BAKERY',
    });
    expect(params).toEqual({ item_count: 3, cart_total: 12000 });
    expect(dropped).toContainEqual({ key: 'vendor_type', reason: 'not_in_contract' });
  });

  it("n'accepte ni objet ni tableau — un objet aplati échapperait au contrôle", () => {
    const { params } = sanitizeParams('restaurant_view', {
      restaurant_id: 'r1',
      restaurant_name: { nom: 'Chez Lilia' } as unknown as string,
    });
    expect(params).toEqual({ restaurant_id: 'r1' });
  });

  it('écarte NaN et Infinity, qui produisent des agrégats faux', () => {
    const { params } = sanitizeParams('view_cart', {
      item_count: Number.NaN,
      cart_total: Number.POSITIVE_INFINITY,
    });
    expect(params).toEqual({});
  });

  it('tronque les textes trop longs', () => {
    const long = 'a'.repeat(500);
    const { params } = sanitizeParams('product_view', { product_name: long });
    expect((params.product_name as string).length).toBe(MAX_STRING_LENGTH);
  });
});

describe('absence de données personnelles', () => {
  const pii = {
    contact_phone: '+242 06 123 45 67',
    phone: '066123456',
    telephone: '066123456',
    email: 'client@example.cg',
    password: 'hunter2',
    firebase_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9.eyJzdWIiOiJhYmMifQ.sig',
    auth_token: 'abc',
    latitude: -4.2634,
    longitude: 15.2429,
    lat: -4.2634,
    lng: 15.2429,
    deliveryAddress: 'Rue Mfilou, face pharmacie',
    adresse: 'Avenue de la Paix',
    landmark: 'portail bleu',
    notes: 'sans piment',
    momo_number: '066123456',
    card: '4111111111111111',
    iban: 'CG00000000000000',
    search_term: 'poulet braisé',
  };

  it.each(FUNNEL_EVENTS)('%s ne laisse passer aucune donnée personnelle', (event) => {
    const { params } = sanitizeParams(event, pii);
    expect(params).toEqual({});
  });

  it('rejette une clé interdite même si elle est ajoutée au contrat', () => {
    expect(isForbiddenKey('contact_phone')).toBe(true);
    expect(isForbiddenKey('deliveryLatitude')).toBe(true);
    expect(isForbiddenKey('payer_message')).toBe(true);
    expect(isForbiddenKey('id_token')).toBe(true);
  });

  it("ne confond pas un montant avec un téléphone ('total' contient 'tel')", () => {
    expect(isForbiddenKey('cart_total')).toBe(false);
    expect(isForbiddenKey('item_count')).toBe(false);
    expect(isForbiddenKey('payment_method')).toBe(false);
    expect(isForbiddenKey('restaurant_name')).toBe(false);
  });

  it('rejette une valeur personnelle rangée sous une clé autorisée', () => {
    // Le cas réel : un nom de produit rempli par le vendeur avec son numéro.
    const { params, dropped } = sanitizeParams('product_view', {
      product_id: 'p1',
      product_name: 'Commandez au 06 123 45 67',
    });
    expect(params).toEqual({ product_id: 'p1' });
    expect(dropped).toContainEqual({ key: 'product_name', reason: 'pii_value' });
  });

  it('reconnaît les formes personnelles usuelles', () => {
    expect(looksLikePii('+242061234567')).toBe(true);
    expect(looksLikePii('client@lilia.cg')).toBe(true);
    expect(looksLikePii('eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.x')).toBe(true);
    expect(looksLikePii('Poulet braisé')).toBe(false);
    expect(looksLikePii('cm4x8k2n0000abcd')).toBe(false);
  });
});

describe('cohérence du contrat', () => {
  it('déclare des paramètres pour chacun des neuf événements du tunnel', () => {
    for (const event of FUNNEL_EVENTS) {
      expect(EVENT_PARAMS[event].length).toBeGreaterThan(0);
    }
  });

  it('impose les paramètres exigés par le contrat officiel', () => {
    expect(EVENT_PARAMS.restaurant_view).toEqual(['restaurant_id', 'restaurant_name']);
    expect(EVENT_PARAMS.product_view).toEqual([
      'product_id',
      'product_name',
      'restaurant_id',
      'price',
    ]);
    expect(EVENT_PARAMS.add_to_cart).toEqual([
      'product_id',
      'product_name',
      'restaurant_id',
      'price',
      'quantity',
    ]);
    expect(EVENT_PARAMS.view_cart).toEqual(['item_count', 'cart_total']);
    expect(EVENT_PARAMS.begin_checkout).toEqual(['item_count', 'cart_total']);
    expect(EVENT_PARAMS.payment_started).toEqual([
      'order_id',
      'payment_method',
      'amount',
      'currency',
    ]);
    expect(EVENT_PARAMS.payment_success).toEqual([
      'order_id',
      'payment_method',
      'amount',
      'currency',
    ]);
    expect(EVENT_PARAMS.order_created).toEqual([
      'order_id',
      'amount',
      'currency',
      'item_count',
    ]);
  });

  it("n'accepte aucune variante de nom d'événement", () => {
    const forbidden = [
      'restaurant_open',
      'restaurant_opened',
      'view_restaurant',
      'restaurant_clicked',
      'restaurant_viewed',
      'vendor_view',
    ];
    for (const name of forbidden) {
      expect(Object.keys(EVENT_PARAMS)).not.toContain(name);
    }
  });
});
