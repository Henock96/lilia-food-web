'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { orderKeys, readPushMessage, syncPush } from '@lilia/api-client';
import { useAuthSession } from '@/lib/auth-session';
import { loadBrowserPush, pushConfigured } from '@/lib/push-loader';
import { pushRoute } from '@/lib/push-routes';

/**
 * Notifications push, sans interface :
 * - remet à jour l'enregistrement d'un navigateur **déjà** autorisé quand une
 *   session s'ouvre (jamais de demande de permission ici) ;
 * - reçoit les messages de `public/push-sw.js` : rechargement des commandes
 *   quand un push arrive onglet visible (la notification système est affichée
 *   par le worker), navigation quand on clique une notification alors qu'un
 *   onglet est ouvert.
 */
export function PushBridge() {
  const { phase, uid, token } = useAuthSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    // Session fermée : la déconnexion a désabonné ce navigateur, la suivante
    // (même compte compris) doit le réinscrire.
    if (phase !== 'ready') syncedFor.current = null;
    if (!pushConfigured || phase !== 'ready' || !uid || !token) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (syncedFor.current === uid) return;
    syncedFor.current = uid;
    loadBrowserPush()
      .then((device) => syncPush(device, { uid, credential: token }))
      .catch(() => {
        // Réessayé au prochain chargement ; rien à montrer à l'utilisateur.
        syncedFor.current = null;
      });
  }, [phase, uid, token]);

  useEffect(() => {
    if (!pushConfigured || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const message = readPushMessage(event.data);
      if (!message) return;
      const href = pushRoute(message.data);
      if (message.source === 'lilia-push-open') {
        router.push(href);
        return;
      }
      // La notification système est déjà affichée par le service worker :
      // la page se contente d'être à jour.
      if (message.data.orderId) void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router, queryClient]);

  return null;
}
