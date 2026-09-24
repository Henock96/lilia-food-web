/**
 * Libellé du badge ouvert / fermé (F3-03).
 *
 * Une boutique en pause a une heure de réouverture connue : « Fermé » seul
 * laissait le client croire à une fermeture pour la journée. Heure de
 * Brazzaville, quel que soit le fuseau du navigateur.
 */
export function openingLabel(
  restaurant: { isOpen: boolean; pausedUntil?: string | null },
  now = new Date(),
): string {
  if (restaurant.isOpen) return 'Ouvert';
  const until = restaurant.pausedUntil ? new Date(restaurant.pausedUntil) : null;
  if (!until || until <= now) return 'Fermé';
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Brazzaville', ...opts }).format(d);
  const day = { day: '2-digit', month: '2-digit' } as const;
  const hour = fmt(until, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(':', 'h');
  return fmt(until, day) === fmt(now, day)
    ? `Rouvre à ${hour}`
    : `Rouvre le ${fmt(until, day)} à ${hour}`;
}
