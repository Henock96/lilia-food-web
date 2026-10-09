import { describe, expect, it } from 'vitest';
import { isValidCongoPhone, normalizeCongoPhone } from '@lilia/utils';

/**
 * Numéro Mobile Money envoyé à `POST /payments`.
 *
 * Le site validait la saisie **après** en avoir retiré les séparateurs, mais
 * envoyait la saisie brute : `+242 06 123 45 67` passait le contrôle du
 * formulaire, créait la commande, puis l'encaissement était refusé (400). Ce
 * qui est validé et ce qui est envoyé doivent être la même chaîne.
 */
describe('normalizeCongoPhone', () => {
  it.each([
    ['+242 06 123 45 67', '+242061234567'],
    ['06 123 45 67', '061234567'],
    ['06-123-45-67', '061234567'],
    ['(06) 123.45.67', '061234567'],
    ['  05 123 45 67  ', '051234567'],
    // `00242` est accepté par le site mais pas par la regex du serveur :
    // on l'envoie sous la forme internationale `+242`.
    ['00242 04 123 45 67', '+242041234567'],
    ['+242061234567', '+242061234567'],
  ])('« %s » → « %s »', (input, expected) => {
    expect(normalizeCongoPhone(input)).toBe(expected);
  });

  it.each([null, undefined, ''])('rend une chaîne vide pour %s', (input) => {
    expect(normalizeCongoPhone(input)).toBe('');
  });
});

describe('isValidCongoPhone', () => {
  it.each(['+242 06 123 45 67', '06 123 45 67', '061234567', '+242061234567'])(
    'accepte « %s »',
    (input) => {
      expect(isValidCongoPhone(input)).toBe(true);
    },
  );

  it.each(['07 123 45 67', '06 123 45', '06 ABC 45 67', '', null])(
    'refuse « %s »',
    (input) => {
      expect(isValidCongoPhone(input)).toBe(false);
    },
  );

  it('tout numéro accepté par le formulaire est envoyé sous une forme que le serveur accepte', () => {
    // Regex de `CreatePaymentDto` / `CreateOrderDto` (lilia-backend,
    // `common/validation/congo-phone.decorator.ts`), appliquée telle quelle.
    const SERVER = /^(\+?242)?0?[456]\d{7}$/;
    for (const input of [
      '+242 06 123 45 67',
      '06-123-45-67',
      '(06) 123.45.67',
      '00242 06 123 45 67',
      '0024206 1234567',
    ]) {
      expect(isValidCongoPhone(input)).toBe(true);
      const sent = normalizeCongoPhone(input);
      expect(sent).toMatch(SERVER);
      expect(isValidCongoPhone(sent)).toBe(true);
    }
  });
});
