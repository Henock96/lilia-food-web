'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  analytics,
  clarityEnabled,
  CLARITY_PROJECT_ID,
  ga4Enabled,
  GA_MEASUREMENT_ID,
  type AnalyticsEvent,
} from '@/lib/analytics';
import { useAuthStore } from '@/store/auth';

/**
 * Charge les outils de mesure et alimente les événements transverses.
 *
 * Trois responsabilités, et rien d'autre — les événements du tunnel sont émis
 * par les écrans qui connaissent le fait métier correspondant :
 *
 *  1. charger GA4 et Clarity, uniquement si leurs identifiants existent ;
 *  2. émettre `page_view` à chaque navigation, **exactement une fois** ;
 *  3. associer l'identifiant interne du client aux envois quand il est connecté.
 *
 * ### Pourquoi `send_page_view: false`
 *
 * GA4 envoie un `page_view` tout seul au `config`, et la « mesure améliorée »
 * en envoie un second à chaque changement d'historique — ce que fait toute
 * navigation client-side de Next. Émettre en plus le nôtre donnerait deux à
 * trois `page_view` par page vue, c'est-à-dire un premier étage de tunnel
 * gonflé et des taux de conversion faux. On coupe donc l'automatisme et on
 * émet nous-mêmes, au seul endroit qui sait ce qu'est une page ici.
 *
 * ⚠️ **La désactivation de la « mesure améliorée » (Enhanced measurement →
 * Page changes based on browser history events) reste à faire dans l'interface
 * GA4** : `send_page_view: false` ne couvre que l'envoi initial.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // ── page_view ──────────────────────────────────────────────────────────────
  //
  // Volontairement indexé sur le seul `pathname` : la chaîne de requête peut
  // contenir un terme de recherche saisi par le client, donc du texte libre —
  // que le contrat interdit d'envoyer. Une page consultée avec deux filtres
  // différents compte pour une page.
  useEffect(() => {
    if (!pathname) return;
    analytics.track('page_view', {
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  // ── Identification ─────────────────────────────────────────────────────────
  //
  // `user.id` est le CUID applicatif, jamais le téléphone ni l'UID Firebase.
  // À la déconnexion on délie explicitement : sans cela, les envois d'un
  // visiteur anonyme sur le même navigateur resteraient attribués au compte
  // précédent.
  useEffect(() => {
    analytics.identify(userId);
  }, [userId]);

  // ── CTA du site vitrine ────────────────────────────────────────────────────
  //
  // Un écouteur délégué sur le document lit `data-analytics-id`. Le `onClick`
  // par bouton obligerait à convertir en composants client des sections rendues
  // sur le serveur (le pied de page, « devenir vendeur ») — alourdir le bundle
  // pour de la mesure serait un mauvais échange.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-analytics-id]',
      );
      const id = target?.dataset.analyticsId;
      if (!id) return;
      analytics.track(id as AnalyticsEvent, { page_path: window.location.pathname });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      {ga4Enabled && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                anonymize_ip: true,
                send_page_view: false
              });
            `}
          </Script>
        </>
      )}

      {clarityEnabled && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}
        </Script>
      )}
    </>
  );
}
