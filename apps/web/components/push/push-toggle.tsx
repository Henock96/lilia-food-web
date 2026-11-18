'use client';

import { useMemo } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { isIosBrowserTab } from '@lilia/api-client';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth-session';
import { loadBrowserPush, pushConfigured } from '@/lib/push-loader';
import { useBrowserPush } from '@/lib/use-browser-push';

/**
 * Activation des notifications push de ce navigateur.
 *
 * `card` : encart complet du profil, qui dit aussi « activées » et « bloquées ».
 * `inline` : rappel discret sur le suivi d'une commande, visible seulement tant
 * que la question n'a pas été posée.
 */
export function PushToggle({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const { uid, token } = useAuthSession();
  const session = useMemo(() => (uid && token ? { uid, credential: token } : null), [uid, token]);
  const { state, busy, enable } = useBrowserPush(loadBrowserPush, session);

  if (!pushConfigured || state === null || !session) return null;

  const activate = async () => {
    try {
      await enable();
    } catch {
      toast.error('Activation impossible pour le moment. Réessayez.');
    }
  };

  if (variant === 'inline') {
    if (state !== 'default') return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4">
        <p className="text-sm text-ink-700">Être prévenu quand votre commande avance&nbsp;?</p>
        <Button size="sm" variant="secondary" loading={busy} onClick={activate} leftIcon={<Bell className="h-3.5 w-3.5" />}>
          Activer
        </Button>
      </div>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm" aria-labelledby="push-title">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-tomato-100">
          {state === 'denied' ? <BellOff className="h-4 w-4 text-tomato-700" /> : <Bell className="h-4 w-4 text-tomato-700" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="push-title" className="font-semibold text-ink-900">Notifications</h2>
          {state === 'granted' && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
              <Check className="h-4 w-4 text-green-700" /> Activées sur ce navigateur.
            </p>
          )}
          {state === 'default' && (
            <>
              <p className="mt-1 text-sm text-ink-500">
                Recevez le suivi de vos commandes, même quand le site est fermé.
              </p>
              <Button className="mt-3" size="sm" loading={busy} onClick={activate}>
                Activer les notifications
              </Button>
            </>
          )}
          {state === 'denied' && (
            <p className="mt-1 text-sm text-ink-500">
              Bloquées par votre navigateur. Autorisez-les dans les réglages du site (icône à gauche de
              l’adresse), puis rechargez la page.
            </p>
          )}
          {state === 'unsupported' && (
            <p className="mt-1 text-sm text-ink-500">
              {isIosBrowserTab()
                ? 'Sur iPhone, ajoutez Lilia Food à l’écran d’accueil (Partager → « Sur l’écran d’accueil ») pour recevoir les notifications.'
                : 'Ce navigateur ne permet pas les notifications.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
