'use client';

import { useCallback, useEffect, useState } from 'react';
import { enablePush, pushState, type PushDevice, type PushSession, type PushState } from '@lilia/api-client';

/**
 * État des notifications push de ce navigateur, et le geste qui les active.
 *
 * `load` doit être une fonction stable (déclarée au niveau du module) : elle
 * charge `firebase/messaging` à la demande, pour qu'il reste hors du bundle
 * initial. `state` vaut `null` tant que le navigateur n'a pas répondu.
 */
export function useBrowserPush(load: () => Promise<PushDevice>, session: PushSession | null) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then(pushState)
      .then(
        (value) => { if (alive) setState(value); },
        () => { if (alive) setState('unsupported'); },
      );
    return () => { alive = false; };
  }, [load]);

  /** À appeler depuis un clic. Lève si l'enregistrement serveur échoue. */
  const enable = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    let device: PushDevice | undefined;
    try {
      device = await load();
      setState(await enablePush(device, session));
    } catch (error) {
      // La permission a pu être accordée avant l'échec serveur : rien n'est
      // inscrit pour autant, le bouton reste là pour réessayer.
      const current = device ? await pushState(device).catch(() => null) : null;
      if (current) setState(current === 'granted' ? 'default' : current);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [load, session]);

  return { state, busy, enable };
}
