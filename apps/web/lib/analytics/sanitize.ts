/**
 * Désinfection des paramètres avant envoi.
 *
 * Trois passes, dans cet ordre, et l'ordre compte :
 *
 *  1. **Liste blanche** — seuls les paramètres déclarés dans `EVENT_PARAMS`
 *     survivent. C'est ce qui empêche un objet produit ou une commande entière
 *     de partir chez Google parce qu'on l'a passé par commodité.
 *  2. **Fragments de clés interdits** — second filet, volontairement redondant
 *     avec le premier : il protège des ajouts futurs à la liste blanche.
 *  3. **Formes de valeurs** — un numéro de téléphone reste un numéro de
 *     téléphone même rangé sous une clé nommée `reference`.
 *
 * Rien ici ne lève : une erreur de mesure ne doit jamais casser un parcours
 * d'achat. Les rejets sont signalés en développement, silencieux en production.
 */

import {
  EVENT_PARAMS,
  FORBIDDEN_KEY_FRAGMENTS,
  MAX_STRING_LENGTH,
  PII_VALUE_PATTERNS,
  type AnalyticsEvent,
  type AnalyticsValue,
  type AnyParams,
} from './contract';

export interface SanitizeResult {
  /** Paramètres prêts à partir. */
  params: Record<string, AnalyticsValue>;
  /** Clés retirées, avec le motif — exploité par les tests et les logs de dev. */
  dropped: { key: string; reason: DropReason }[];
}

export type DropReason =
  | 'not_in_contract'
  | 'forbidden_key'
  | 'pii_value'
  | 'unsupported_type'
  | 'empty';

/**
 * Une clé porte-t-elle un fragment interdit ?
 *
 * La comparaison se fait **par segment**, pas par sous-chaîne : sans cela,
 * `cart_total` contiendrait `tel` et tout montant serait rejeté.
 *
 * Le découpage traite aussi la casse chameau, parce que les clés du dépôt
 * mélangent les deux conventions : `deliveryLatitude` doit être reconnu au même
 * titre que `delivery_latitude`. Le test qui l'a montré valait mieux qu'une
 * relecture.
 */
export function isForbiddenKey(key: string): boolean {
  const segments = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return FORBIDDEN_KEY_FRAGMENTS.some((fragment) => segments.includes(fragment));
}

/** La valeur ressemble-t-elle à une donnée personnelle ? */
export function looksLikePii(value: AnalyticsValue): boolean {
  if (typeof value !== 'string') return false;
  return PII_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Applique le contrat à une charge utile brute.
 *
 * `event` détermine la liste blanche ; un événement inconnu ne laisse rien
 * passer, ce qui est le comportement voulu — mieux vaut un événement sans
 * paramètre qu'un événement avec des paramètres non contractuels.
 */
export function sanitizeParams(
  event: AnalyticsEvent,
  raw: AnyParams,
): SanitizeResult {
  const allowed: readonly string[] = EVENT_PARAMS[event] ?? [];
  const params: Record<string, AnalyticsValue> = {};
  const dropped: SanitizeResult['dropped'] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      dropped.push({ key, reason: 'empty' });
      continue;
    }
    if (!allowed.includes(key)) {
      dropped.push({ key, reason: 'not_in_contract' });
      continue;
    }
    if (isForbiddenKey(key)) {
      dropped.push({ key, reason: 'forbidden_key' });
      continue;
    }

    const coerced = coerce(value);
    if (coerced === undefined) {
      dropped.push({ key, reason: 'unsupported_type' });
      continue;
    }
    if (looksLikePii(coerced)) {
      dropped.push({ key, reason: 'pii_value' });
      continue;
    }

    params[key] =
      typeof coerced === 'string' ? coerced.slice(0, MAX_STRING_LENGTH) : coerced;
  }

  return { params, dropped };
}

/**
 * Ramène une valeur à l'un des trois types transmissibles.
 *
 * Les objets et tableaux sont rejetés plutôt qu'aplatis : un objet aplati, ce
 * sont des clés qu'aucune liste blanche n'a validées.
 */
function coerce(value: unknown): AnalyticsValue | undefined {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    // NaN et Infinity produisent des agrégats faux et silencieux côté GA4.
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}
