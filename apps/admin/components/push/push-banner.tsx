'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { isIosBrowserTab } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { loadBrowserPush, pushConfigured } from '@/lib/push-loader';
import { useBrowserPush } from '@/lib/use-browser-push';

const DISMISS_KEY = 'lilia_push_banner_dismissed';

function dismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Invite à activer les notifications push, en tête de l'administration, tant
 * que ce navigateur ne les a pas accordées. Masquable pour la session : elle
 * revient au prochain onglet, parce qu'un vendeur sans notification rate des
 * commandes.
 */
export function PushBanner() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const session = useMemo(() => (user && token ? { uid: user.id, credential: token } : null), [user, token]);
  const { state, busy, enable } = useBrowserPush(loadBrowserPush, session);
  const [dismissed, setDismissed] = useState(dismissedThisSession);

  if (!pushConfigured || !session || dismissed || state === null || state === 'granted') return null;
  if (state === 'unsupported' && !isIosBrowserTab()) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sans stockage, le bandeau se ferme pour cette page seulement.
    }
    setDismissed(true);
  };

  const activate = async () => {
    try {
      await enable();
    } catch {
      toast.error('Activation impossible pour le moment. Réessayez.');
    }
  };

  const purpose = user?.role === 'RESTAURATEUR'
    ? 'pour être alerté de chaque nouvelle commande, même quand cet onglet est en arrière-plan'
    : 'pour recevoir les alertes d’exploitation : incidents, vendeurs à valider, approbations';

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 lg:px-6"
    >
      {state === 'denied' ? <BellOff className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <Bell className="mt-0.5 h-4 w-4 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        {state === 'default' && (
          <p>
            Activez les notifications {purpose}.{' '}
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="font-semibold underline underline-offset-2 disabled:opacity-60"
            >
              {busy ? 'Activation…' : 'Activer'}
            </button>
          </p>
        )}
        {state === 'denied' && (
          <p>
            Les notifications sont bloquées par ce navigateur. Autorisez-les dans les réglages du site (icône à gauche de
            l’adresse), puis rechargez la page — {purpose}.
          </p>
        )}
        {state === 'unsupported' && (
          <p>Sur iPhone et iPad, ajoutez ce site à l’écran d’accueil pour recevoir les notifications.</p>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Masquer" className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
