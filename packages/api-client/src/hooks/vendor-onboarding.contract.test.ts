import { describe, expect, it } from 'vitest';

import { createVendorRequest } from './vendor-onboarding';

/**
 * Idempotence de la création de vendeur.
 *
 * ## Le défaut
 *
 * `useCreateVendorOnboarding` fabriquait la clé **à l'intérieur** de
 * `mutationFn` :
 *
 * ```ts
 * headers: { 'Idempotency-Key': crypto.randomUUID() }   // ⚠️ à chaque appel
 * ```
 *
 * Le commentaire au-dessus annonçait pourtant : « un double-clic ou un retry
 * réseau rejoue la réponse au lieu de créer un second vendeur avec un second
 * compte Firebase ». Une clé neuve à chaque appel n'est pas une clé
 * d'idempotence : deux clics produisaient deux vendeurs, deux comptes Firebase
 * et deux e-mails d'invitation.
 *
 * Le backend, lui, **lit bien** l'en-tête (`vendor-onboarding.controller.ts`).
 * La garde existait côté serveur ; c'est le client qui la désarmait.
 *
 * ## Ce qui est corrigé
 *
 * La clé devient un **paramètre**, comme pour `useCreateOrder(token, key)` :
 * c'est l'appelant qui la tient, stable pour toute une session de formulaire.
 * `lilia-food-admin` faisait déjà ainsi (`final _idempotencyKey` sur le
 * `State` de l'écran) — deux dépôts plus loin, la bonne forme existait.
 */
describe('createVendorRequest', () => {
  const dto = {
    vendorType: 'HOME_COOK',
    ownerNom: 'Awa',
    ownerEmail: 'awa@example.cg',
    ownerPhone: '060000001',
    nom: 'Chez Awa',
    adresse: 'Bacongo',
    phone: '060000002',
  } as never;

  it('porte la clé d’idempotence fournie par l’appelant', () => {
    const { init } = createVendorRequest({
      dto,
      token: 't',
      idempotencyKey: 'cle-de-session',
    });

    expect(
      (init.headers as Record<string, string>)['Idempotency-Key'],
    ).toBe('cle-de-session');
  });

  it('rejoue la MÊME clé sur deux appels — c’est tout l’intérêt', () => {
    const key = 'cle-de-session';
    const premier = createVendorRequest({ dto, token: 't', idempotencyKey: key });
    const second = createVendorRequest({ dto, token: 't', idempotencyKey: key });

    const keyOf = (r: typeof premier) =>
      (r.init.headers as Record<string, string>)['Idempotency-Key'];

    // Le défaut d'origine : deux appels, deux clés, deux vendeurs.
    expect(keyOf(premier)).toBe(keyOf(second));
  });

  it('vise POST /admin/vendors', () => {
    const { path, init } = createVendorRequest({
      dto,
      token: 't',
      idempotencyKey: 'k',
    });

    expect(path).toBe('/admin/vendors');
    expect(init.method).toBe('POST');
  });

  it('refuse une clé vide plutôt que d’en fabriquer une en silence', () => {
    // Une clé absente rétablirait exactement le défaut, sans que rien ne le
    // signale. Mieux vaut échouer chez l'appelant.
    expect(() =>
      createVendorRequest({ dto, token: 't', idempotencyKey: '  ' }),
    ).toThrow();
  });

  it('transmet le corps tel quel', () => {
    const { init } = createVendorRequest({
      dto,
      token: 't',
      idempotencyKey: 'k',
    });

    expect(JSON.parse(init.body as string)).toMatchObject({
      nom: 'Chez Awa',
      vendorType: 'HOME_COOK',
    });
  });
});
