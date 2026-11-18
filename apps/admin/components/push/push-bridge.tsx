'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { incidentKeys, opsKeys, orderKeys, readPushMessage, syncPush } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { loadBrowserPush, pushConfigured } from '@/lib/push-loader';
import { pushRoute } from '@/lib/push-routes';

/**
 * Notifications push de l'administration, sans interface :
 * - remet à jour l'enregistrement d'un navigateur **déjà** autorisé (jamais de
 *   demande de permission ici — c'est `PushBanner`) ;
 * - reçoit les messages de `public/push-sw.js`. Onglet visible : les listes
 *   concernées se rechargent ; une nouvelle commande sonne et reste affichée
 *   jusqu'au clic, parce qu'un vendeur qui la rate la perd.
 */
export function PushBridge() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    // Session fermée : la déconnexion a désabonné ce navigateur, la suivante
    // (même compte compris) doit le réinscrire.
    if (!user) syncedFor.current = null;
    if (!pushConfigured || !user || !token) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    loadBrowserPush()
      .then((device) => syncPush(device, { uid: user.id, credential: token }))
      .catch(() => {
        syncedFor.current = null;
      });
  }, [user, token]);

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

      const type = message.data.type ?? '';
      if (message.data.orderId) void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      if (type === 'incident') void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      void queryClient.invalidateQueries({ queryKey: opsKeys.queue });

      // La notification système est affichée par le service worker. Seule une
      // nouvelle commande ajoute une alerte qui reste à l'écran et sonne : la
      // notification système s'efface seule, et une commande ratée est perdue.
      if (type !== 'new_order') return;
      chime();
      toast(message.title, {
        description: message.body || undefined,
        duration: Infinity,
        action: { label: 'Voir', onClick: () => router.push(href) },
      });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router, queryClient]);

  return null;
}

/** Deux notes courtes, sans fichier audio. Muet si le navigateur refuse. */
function chime() {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    [880, 1320].forEach((frequency, i) => {
      const start = ctx.currentTime + i * 0.18;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.17);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Lecture refusée (aucun geste encore fait sur la page) : le toast suffit.
  }
}
