/**
 * Libellé ouvert / fermé / réouverture (F3-03) — **mise en forme seulement**.
 *
 * Le site ne décide jamais de l'ouverture : `isOpen` et `nextOpeningAt` sont
 * calculés par le serveur. Ce module reprend l'ordre de lecture de
 * l'application (`lilia-app/lib/features/home/domain/opening_label.dart`) :
 *
 * | Entrée | Libellé |
 * |---|---|
 * | `isOpen` | « Ouvert » |
 * | fermé, réouverture aujourd'hui | « Fermé · ouvre à 18h00 » |
 * | … demain | « Fermé · ouvre demain à 09h00 » |
 * | … plus tard | « Fermé · ouvre le 02/10 à 10h00 » |
 * | fermé, réouverture inconnue | « Fermé » — jamais une heure inventée |
 *
 * ## `nextOpeningAt` avant `pausedUntil`
 *
 * Le site n'affichait que `pausedUntil` : « Fermé » sec pour toute boutique
 * fermée par ses horaires (huit cartes sur neuf la nuit), alors que
 * l'application disait déjà quand elle rouvre. `nextOpeningAt` est calculé
 * pause comprise : une pause qui finit à 23h00 chez un vendeur qui ferme à
 * 22h00 donne « demain à 10h00 », là où `pausedUntil` annoncerait 23h00 — une
 * heure fausse. Quand le serveur sert le champ, il fait donc foi, **y compris
 * à `null`** (fermé à la main, rien sous huit jours). `pausedUntil` n'est lu
 * que face à un serveur antérieur, qui ne sert pas `nextOpeningAt`.
 *
 * Heure de Brazzaville, quel que soit le fuseau du navigateur.
 */
export function openingLabel(
  restaurant: { isOpen: boolean; pausedUntil?: string | null; nextOpeningAt?: string | null },
  now = new Date(),
): string {
  if (restaurant.isOpen) return 'Ouvert';
  const served = 'nextOpeningAt' in restaurant;
  const raw = served ? restaurant.nextOpeningAt : restaurant.pausedUntil;
  const reopening = raw ? new Date(raw) : null;
  if (!reopening || Number.isNaN(reopening.getTime()) || reopening <= now) return 'Fermé';
  return `Fermé · ${reopeningWhen(reopening, now)}`;
}

const BRAZZAVILLE = 'Africa/Brazzaville';

/** Jour civil à Brazzaville, comparable par simple différence. */
function brazzavilleDay(d: Date): number {
  const [y, m, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZZAVILLE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .split('-')
    .map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

/** « ouvre à 10h00 », « ouvre demain à 10h00 » ou « ouvre le 02/10 à 10h00 ». */
function reopeningWhen(at: Date, now: Date): string {
  const hour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: BRAZZAVILLE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(at)
    .replace(':', 'h');
  const days = brazzavilleDay(at) - brazzavilleDay(now);
  if (days === 0) return `ouvre à ${hour}`;
  if (days === 1) return `ouvre demain à ${hour}`;
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: BRAZZAVILLE,
    day: '2-digit',
    month: '2-digit',
  }).format(at);
  return `ouvre le ${date} à ${hour}`;
}
