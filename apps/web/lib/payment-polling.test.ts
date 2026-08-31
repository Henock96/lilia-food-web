import { describe, expect, it } from 'vitest';
import { paymentPollIntervalMs } from '@lilia/api-client';
import type { PaymentStatusView } from '@lilia/types';

/**
 * Cadence d'interrogation du paiement.
 *
 * Le panneau de paiement annonce trois choses au client : qu'on vérifie
 * régulièrement, qu'on accélère au début, et qu'on finit par s'arrêter sans que
 * cela veuille dire « échec ». Ces trois promesses tiennent dans une seule
 * fonction — autant la vérifier plutôt que de la relire.
 *
 * Elle doit rester alignée sur `payment_status_controller.dart` (mobile) :
 * deux clients qui interrogent le même serveur à deux cadences différentes
 * donnent deux expériences différentes pour la même commande.
 */
describe('paymentPollIntervalMs', () => {
  const T0 = Date.parse('2026-08-31T10:00:00.000Z');

  const pending = (createdAt: string): Pick<PaymentStatusView, 'status' | 'createdAt'> => ({
    status: 'PENDING',
    createdAt,
  });

  const at = (secondsAfter: number) => T0 + secondsAfter * 1000;
  const created = new Date(T0).toISOString();

  it('interroge toutes les 3 s pendant la première minute', () => {
    // Le client compose son code : c'est le moment où une seconde de retard se
    // voit le plus.
    expect(paymentPollIntervalMs(pending(created), at(0))).toBe(3000);
    expect(paymentPollIntervalMs(pending(created), at(30))).toBe(3000);
    expect(paymentPollIntervalMs(pending(created), at(59))).toBe(3000);
  });

  it('passe à 5 s au-delà d’une minute', () => {
    expect(paymentPollIntervalMs(pending(created), at(60))).toBe(5000);
    expect(paymentPollIntervalMs(pending(created), at(179))).toBe(5000);
  });

  it('cesse d’interroger après trois minutes', () => {
    expect(paymentPollIntervalMs(pending(created), at(181))).toBe(false);
    expect(paymentPollIntervalMs(pending(created), at(3600))).toBe(false);
  });

  it.each(['SUCCESS', 'FAILED', 'CANCELLED'] as const)(
    'n’interroge pas un paiement %s',
    (status) => {
      expect(
        paymentPollIntervalMs({ status, createdAt: created }, at(1)),
      ).toBe(false);
    },
  );

  it('n’interroge pas quand aucune tentative n’existe', () => {
    expect(paymentPollIntervalMs(null, at(1))).toBe(false);
    expect(paymentPollIntervalMs(undefined, at(1))).toBe(false);
  });

  it('une date illisible arrête l’interrogation au lieu de boucler', () => {
    // `NaN` comparé à quoi que ce soit est faux : sans garde explicite, la
    // branche « moins d'une minute » l'emportait et le navigateur interrogeait
    // toutes les 3 s indéfiniment.
    expect(paymentPollIntervalMs(pending('pas-une-date'), at(1))).toBe(false);
  });
});
