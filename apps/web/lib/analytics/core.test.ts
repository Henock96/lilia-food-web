import { beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsCore, onceKey, type AnalyticsSink } from './core';
import { OnceRegistry, RepeatGuard, signature, type KeyValueStore } from './dedupe';
import { CURRENCY, FUNNEL_EVENTS, type AnalyticsEvent } from './contract';

/** Collecteur d'essai : enregistre ce qui serait parti chez Google. */
function recorder() {
  const events: { name: string; params: Record<string, unknown> }[] = [];
  const identified: (string | null)[] = [];
  const sink: AnalyticsSink = {
    name: 'test',
    event: (name, params) => events.push({ name, params }),
    identify: (id) => identified.push(id),
  };
  return { events, identified, sink, names: () => events.map((e) => e.name) };
}

/** `localStorage` en mémoire — le vrai n'existe pas en environnement node. */
function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

/** Horloge pilotée : une garantie temporelle se teste, elle ne s'attend pas. */
function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('déduplication du bruit de cycle de vie', () => {
  it('absorbe un double montage React (StrictMode) sur restaurant_view', () => {
    const { sink, events } = recorder();
    const time = clock();
    const a = new AnalyticsCore({ sinks: [sink], now: time.now });

    // Deux montages successifs du même effet, à quelques millisecondes.
    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'Chez Lilia' });
    time.advance(12);
    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'Chez Lilia' });

    expect(events).toHaveLength(1);
  });

  it('compte une seconde consultation réelle, plus tard', () => {
    const { sink, events } = recorder();
    const time = clock();
    const a = new AnalyticsCore({ sinks: [sink], now: time.now });

    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'Chez Lilia' });
    time.advance(30_000);
    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'Chez Lilia' });

    expect(events).toHaveLength(2);
  });

  it('ne confond pas deux vendeurs différents', () => {
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [sink], now: clock().now });

    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'A' });
    a.track('restaurant_view', { restaurant_id: 'r2', restaurant_name: 'B' });

    expect(events).toHaveLength(2);
  });

  it("la signature ne dépend pas de l'ordre des clés", () => {
    expect(signature('add_to_cart', { a: 1, b: 2 })).toBe(
      signature('add_to_cart', { b: 2, a: 1 }),
    );
  });
});

describe('unicité métier persistante', () => {
  let store: ReturnType<typeof memoryStore>;

  beforeEach(() => {
    store = memoryStore();
  });

  it("order_created n'est compté qu'une fois par commande, même après rechargement", () => {
    const first = recorder();
    const a = new AnalyticsCore({ sinks: [first.sink], store });
    expect(
      a.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
        order_id: 'o1',
        amount: 12000,
        currency: CURRENCY,
        item_count: 3,
      }),
    ).toBe(true);

    // Rechargement de page : nouvelle instance, même stockage.
    const second = recorder();
    const b = new AnalyticsCore({ sinks: [second.sink], store });
    expect(
      b.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
        order_id: 'o1',
        amount: 12000,
        currency: CURRENCY,
        item_count: 3,
      }),
    ).toBe(false);

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(0);
  });

  it('payment_success ne compte qu\'une fois malgré une interrogation toutes les 3 s', () => {
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [sink], store });

    for (let i = 0; i < 20; i++) {
      a.trackOnce(onceKey.paymentSuccess('pay1'), 'payment_success', {
        order_id: 'o1',
        payment_method: 'MTN_MOMO',
        amount: 12000,
        currency: CURRENCY,
      });
    }
    expect(events).toHaveLength(1);
  });

  it('un webhook rejoué ne produit pas de second payment_success', () => {
    // Côté serveur, un webhook dupliqué rend `DUPLICATE` et n'émet rien ; côté
    // client, le rejeu se traduit par une seconde lecture du même paiement.
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [sink], store });
    const emit = () =>
      a.trackOnce(onceKey.paymentSuccess('pay1'), 'payment_success', {
        order_id: 'o1',
        payment_method: 'MTN_MOMO',
        amount: 12000,
        currency: CURRENCY,
      });
    expect(emit()).toBe(true);
    expect(emit()).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('deux tentatives de paiement sur la même commande comptent deux fois', () => {
    // C'est l'écart entre `payment_started` et `payment_success` qui mesure les
    // échecs d'opérateur : le masquer viderait l'étape de son intérêt.
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [sink], store });
    const start = (paymentId: string) =>
      a.trackOnce(onceKey.paymentStarted(paymentId), 'payment_started', {
        order_id: 'o1',
        payment_method: 'MTN_MOMO',
        amount: 12000,
        currency: CURRENCY,
      });
    start('pay1');
    start('pay2');
    expect(events).toHaveLength(2);
  });

  it('borne le nombre de clés conservées', () => {
    const registry = new OnceRegistry(store, 3);
    ['a', 'b', 'c', 'd'].forEach((k) => registry.claim(k));
    expect(registry.claim('d')).toBe(false); // récente : toujours connue
    expect(registry.claim('a')).toBe(true); // oubliée : la plus ancienne
  });

  it('laisse passer quand aucun stockage n\'est disponible', () => {
    const registry = new OnceRegistry(null);
    expect(registry.claim('k')).toBe(true);
    expect(registry.claim('k')).toBe(true);
  });
});

describe('cas d\'erreur du parcours de paiement', () => {
  it('un paiement échoué ne produit pas payment_success', () => {
    const { sink, names } = recorder();
    const store = memoryStore();
    const a = new AnalyticsCore({ sinks: [sink], store });

    a.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
      order_id: 'o1',
      amount: 12000,
      currency: CURRENCY,
      item_count: 2,
    });
    a.trackOnce(onceKey.paymentStarted('pay1'), 'payment_started', {
      order_id: 'o1',
      payment_method: 'MTN_MOMO',
      amount: 12000,
      currency: CURRENCY,
    });
    // Statut FAILED : aucun appel `payment_success` n'est écrit dans le code
    // métier. Le tunnel s'arrête donc à `payment_started`, ce qu'on vérifie.

    expect(names()).toEqual(['order_created', 'payment_started']);
    expect(names()).not.toContain('payment_success');
  });

  it("un abandon du checkout laisse le tunnel s'arrêter à begin_checkout", () => {
    const { sink, names } = recorder();
    const a = new AnalyticsCore({ sinks: [sink] });
    a.track('view_cart', { item_count: 2, cart_total: 9000 });
    a.track('begin_checkout', { item_count: 2, cart_total: 9000 });
    expect(names()).toEqual(['view_cart', 'begin_checkout']);
  });

  it('une commande annulée ne rétracte pas order_created', () => {
    // Une commande annulée a bel et bien été créée : le tunnel de création
    // reste vrai. L'annulation se lit côté base, pas en retirant un événement.
    const { sink, names } = recorder();
    const store = memoryStore();
    const a = new AnalyticsCore({ sinks: [sink], store });
    a.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
      order_id: 'o1',
      amount: 5000,
      currency: CURRENCY,
      item_count: 1,
    });
    expect(names()).toEqual(['order_created']);
  });
});

describe('robustesse', () => {
  it('un collecteur en panne n\'empêche pas les autres ni ne lève', () => {
    const broken: AnalyticsSink = {
      name: 'broken',
      event: () => {
        throw new Error('réseau coupé');
      },
    };
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [broken, sink] });
    expect(() => a.track('view_cart', { item_count: 1, cart_total: 100 })).not.toThrow();
    expect(events).toHaveLength(1);
  });

  it('sans aucun collecteur, track() reste appelable', () => {
    const a = new AnalyticsCore({ sinks: [] });
    expect(() => a.track('page_view', { page_path: '/' })).not.toThrow();
  });
});

describe('identification', () => {
  it("transmet l'identifiant interne, et le délie à la déconnexion", () => {
    const { sink, identified } = recorder();
    const a = new AnalyticsCore({ sinks: [sink] });
    a.identify('cm4x8k2n0000abcd');
    a.identify(null);
    expect(identified).toEqual(['cm4x8k2n0000abcd', null]);
  });

  it("ne laisse pas passer un numéro de téléphone comme identifiant de paramètre", () => {
    // Garde-fou : l'identifiant utilisateur passe par `identify`, jamais par un
    // paramètre d'événement — et aucun événement ne déclare de champ pour lui.
    const { sink, events } = recorder();
    const a = new AnalyticsCore({ sinks: [sink] });
    a.track('order_created', {
      order_id: 'o1',
      user_phone: '+242061234567',
    } as never);
    expect(events[0]?.params).toEqual({ order_id: 'o1' });
  });
});

describe('tunnel officiel', () => {
  it('émet les neuf étapes, dans l\'ordre, sans variante de nom', () => {
    const { sink, names } = recorder();
    const store = memoryStore();
    const time = clock();
    const a = new AnalyticsCore({ sinks: [sink], store, now: time.now });

    a.track('page_view', { page_path: '/restaurants' });
    time.advance(2000);
    a.track('restaurant_view', { restaurant_id: 'r1', restaurant_name: 'Chez Lilia' });
    time.advance(2000);
    a.track('product_view', {
      product_id: 'p1',
      product_name: 'Poulet braisé',
      restaurant_id: 'r1',
      price: 3500,
    });
    time.advance(2000);
    a.track('add_to_cart', {
      product_id: 'p1',
      product_name: 'Poulet braisé',
      restaurant_id: 'r1',
      price: 3500,
      quantity: 1,
    });
    time.advance(2000);
    a.track('view_cart', { item_count: 1, cart_total: 3500 });
    time.advance(2000);
    a.track('begin_checkout', { item_count: 1, cart_total: 3500 });
    time.advance(2000);
    a.trackOnce(onceKey.paymentStarted('pay1'), 'payment_started', {
      order_id: 'o1',
      payment_method: 'MTN_MOMO',
      amount: 4200,
      currency: CURRENCY,
    });
    a.trackOnce(onceKey.paymentSuccess('pay1'), 'payment_success', {
      order_id: 'o1',
      payment_method: 'MTN_MOMO',
      amount: 4200,
      currency: CURRENCY,
    });
    a.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
      order_id: 'o1',
      amount: 4200,
      currency: CURRENCY,
      item_count: 1,
    });

    expect(names()).toEqual([
      'page_view',
      'restaurant_view',
      'product_view',
      'add_to_cart',
      'view_cart',
      'begin_checkout',
      'payment_started',
      'payment_success',
      'order_created',
    ]);
    // Tous les noms émis appartiennent au tunnel officiel.
    for (const name of names()) {
      expect(FUNNEL_EVENTS).toContain(name as AnalyticsEvent);
    }
  });

  it('tout montant du tunnel voyage avec sa devise', () => {
    const { sink, events } = recorder();
    const store = memoryStore();
    const a = new AnalyticsCore({ sinks: [sink], store });
    a.trackOnce(onceKey.orderCreated('o1'), 'order_created', {
      order_id: 'o1',
      amount: 4200,
      currency: CURRENCY,
      item_count: 1,
    });
    expect(events[0]?.params.currency).toBe('XAF');
  });
});

describe('RepeatGuard', () => {
  it('purge les entrées expirées au-delà du seuil', () => {
    const time = clock();
    const guard = new RepeatGuard(1000, time.now);
    for (let i = 0; i < 250; i++) guard.allow(`sig-${i}`);
    time.advance(2000);
    // Après expiration, une signature déjà vue repasse.
    expect(guard.allow('sig-0')).toBe(true);
  });
});
