import type { Restaurant } from '@lilia/types';

/**
 * Modes de service qu'un vendeur propose : livraison, retrait sur place, ou
 * les deux.
 *
 * **Le serveur décide** : `supportsDelivery` / `supportsPickup` sont relus au
 * checkout, qui refuse un mode non proposé (`DELIVERY_UNAVAILABLE`,
 * `PICKUP_UNAVAILABLE`). Ce module évite seulement de proposer un choix voué
 * au refus ; il n'autorise rien.
 *
 * Champ absent (réponse antérieure aux colonnes, août 2026) → `true` : le
 * vendeur faisait alors les deux, c'est aussi le défaut en base.
 */
export interface ServiceModes {
  delivery: boolean;
  pickup: boolean;
}

export function serviceModesOf(
  vendor: Pick<Restaurant, 'supportsDelivery' | 'supportsPickup'>,
): ServiceModes {
  return {
    delivery: vendor.supportsDelivery ?? true,
    pickup: vendor.supportsPickup ?? true,
  };
}

/**
 * Mode effectivement retenu : le choix du client s'il est proposé, sinon le
 * seul mode proposé. Sans vendeur chargé, ou si le vendeur ne propose rien,
 * le choix est rendu tel quel — le serveur tranchera, et l'écran le dit.
 */
export function resolveServiceMode(
  isDelivery: boolean,
  modes: ServiceModes | null,
): boolean {
  if (!modes) return isDelivery;
  if (isDelivery ? modes.delivery : modes.pickup) return isDelivery;
  if (modes.delivery) return true;
  if (modes.pickup) return false;
  return isDelivery;
}

/** Le vendeur ne sert personne : aucun mode n'est proposé. */
export function noServiceMode(modes: ServiceModes | null): boolean {
  return modes != null && !modes.delivery && !modes.pickup;
}

/** Codes d'erreur du checkout quand le mode n'est pas (ou plus) proposé. */
export const SERVICE_MODE_ERROR_CODES = [
  'DELIVERY_UNAVAILABLE',
  'PICKUP_UNAVAILABLE',
] as const;

export function isServiceModeError(code: string | null | undefined): boolean {
  return (SERVICE_MODE_ERROR_CODES as readonly string[]).includes(code ?? '');
}
