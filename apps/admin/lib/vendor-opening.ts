import type { VendorOpeningState } from '@lilia/types';

/**
 * Affichage des fermetures (F3-03). Les heures sont celles de Brazzaville
 * (UTC+1, sans heure d'été), quel que soit le fuseau du poste de l'admin.
 */
export const BRAZZAVILLE_TZ = 'Africa/Brazzaville';

/** « 02/10 à 14h30 », heure de Brazzaville. */
export function formatBrazzaville(iso: string): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: BRAZZAVILLE_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')} à ${get('hour')}h${get('minute')}`;
}

/**
 * Valeur d'un `<input type="datetime-local">`, saisie en heure de
 * Brazzaville, vers un instant ISO. Le navigateur de l'admin peut être dans un
 * autre fuseau : on n'utilise donc pas `new Date(value)`, qui l'interpréterait
 * dans le fuseau du poste.
 */
export function localInputToIso(value: string): string {
  // « 2026-12-24T08:00 » à UTC+1 = 07:00 UTC.
  const utc = new Date(`${value}:00.000Z`).getTime() - 60 * 60 * 1000;
  return new Date(utc).toISOString();
}

/** Une phrase : ouvert, ou pourquoi fermé et jusqu'à quand. */
export function openingSummary(
  s: Pick<VendorOpeningState, 'isOpen' | 'reason' | 'until'>,
): string {
  switch (s.reason) {
    case 'OPEN':
      return 'Ouverte';
    case 'PAUSED':
      return `En pause jusqu'au ${formatBrazzaville(s.until!)}`;
    case 'CLOSURE':
      return `En congé jusqu'au ${formatBrazzaville(s.until!)}`;
    case 'HOLIDAY':
      return "Fermée aujourd'hui (jour férié)";
    case 'MANUAL':
      return 'Fermée à la main (ancien interrupteur)';
    case 'OUTSIDE_HOURS':
      return 'Fermée (hors horaires)';
  }
}
