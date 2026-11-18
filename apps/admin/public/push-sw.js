/*
 * Service worker des notifications push Lilia Food.
 *
 * ⚠️ Fichier IDENTIQUE dans apps/web/public et apps/admin/public — un test
 * (apps/web/lib/push-sw.test.ts) le vérifie. Modifier les deux, ou aucun.
 *
 * Il ne charge pas le SDK Firebase : la page s'abonne (firebase/messaging
 * `getToken`), et ce fichier ne fait qu'afficher ce que FCM livre. La charge
 * utile d'un message FCM est `{ notification: { title, body }, data: {…} }`.
 *
 * Il ne contient AUCUNE règle de navigation : un clic ouvre
 * `/notifications/ouvrir?<data>`, où chaque site traduit `data` en page
 * (`lib/push-routes.ts`). Une seule table par site, testée, et pas de copie ici.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function readPayload(event) {
  try {
    return event.data ? event.data.json() : null;
  } catch {
    return null;
  }
}

/** Ne garde que des chaînes : `data` finit dans une URL et dans un postMessage. */
function stringsOnly(value) {
  const out = {};
  if (!value || typeof value !== 'object') return out;
  for (const key of Object.keys(value)) {
    if (typeof value[key] === 'string') out[key] = value[key];
  }
  return out;
}

function windows() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  if (!payload) return;

  const notification = payload.notification || {};
  const data = stringsOnly(payload.data);
  const title = notification.title || 'Lilia Food';
  const body = notification.body || '';

  event.waitUntil(
    Promise.all([
      // TOUJOURS une notification visible, onglet ouvert ou non : Safari
      // (macOS et iOS) révoque l'abonnement d'un site dont les push restent
      // silencieux, au bout de quelques-uns.
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        data,
        // Une commande = une notification à jour, pas une pile.
        tag: data.orderId ? 'order:' + data.orderId : undefined,
      }),
      // Les onglets visibles rechargent leurs données (et l'administration
      // sonne pour une nouvelle commande) ; ils n'affichent rien en double.
      windows().then((clients) => {
        clients
          .filter((c) => c.visibilityState === 'visible')
          .forEach((c) => c.postMessage({ source: 'lilia-push', title, body, data }));
      }),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = stringsOnly(event.notification.data);

  event.waitUntil(
    windows().then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        // La page navigue elle-même : `client.navigate` échoue sur un onglet
        // que ce service worker ne contrôle pas encore.
        existing.postMessage({ source: 'lilia-push-open', data });
        return existing.focus();
      }
      return self.clients.openWindow('/notifications/ouvrir?' + new URLSearchParams(data).toString());
    }),
  );
});
