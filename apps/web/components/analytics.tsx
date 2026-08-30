'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { GA_ID, analyticsEnabled, track, type AnalyticsEvent } from '@/lib/analytics';

/**
 * Charge GA4 et branche le suivi des CTA.
 *
 * Le suivi des clics passe par un unique écouteur délégué sur le document,
 * qui lit l'attribut `data-analytics-id` de l'élément cliqué. Alternative
 * retenue face à un `onClick` par bouton : elle n'oblige pas à convertir en
 * composant client des sections qui sont aujourd'hui rendues sur le serveur
 * (le footer, la page « devenir vendeur »), ce qui aurait alourdi le bundle
 * pour de la simple mesure.
 */
export function Analytics() {
  useEffect(() => {
    if (!analyticsEnabled) return;

    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-analytics-id]',
      );
      const id = target?.dataset.analyticsId;
      if (!id) return;

      track(id as AnalyticsEvent, {
        // Permet de distinguer un même CTA selon la page où il est cliqué.
        page: window.location.pathname,
      });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!analyticsEnabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
