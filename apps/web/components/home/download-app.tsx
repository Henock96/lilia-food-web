import Image from 'next/image';
import Link from 'next/link';

/**
 * URL réelle de l'application cliente sur Google Play.
 *
 * Elle pointait auparavant sur `com.lilia.food`, un identifiant qui n'existe
 * pas : l'`applicationId` déclaré dans `lilia-app/android/app/build.gradle.kts`
 * est `com.dreesis.lilia.lilia_app`. Le bouton central du site menait donc à
 * une page d'erreur. Si cet identifiant change côté app, il doit changer ici.
 */
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.dreesis.lilia.lilia_app';

export function DownloadApp() {
  return (
    <section className="overflow-hidden border-y border-ink-100 bg-white py-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* Texte + boutons */}
        <div className="max-w-md text-center lg:text-left">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">
            Mieux avec notre app
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-500 sm:text-base">
            Commande en un clic, suis ta livraison en temps réel et paye par
            Mobile Money — tout est plus simple sur l&apos;appli Lilia Food.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {/* Google Play */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-id="app_download_click"
              aria-label="Disponible sur Google Play : télécharger Lilia Food"
              className="inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-5 py-3 text-white transition-colors hover:bg-ink-700"
            >
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199 2.302 1.33a1 1 0 0 1 0 1.724l-2.302 1.33-2.532-2.532 2.532-2.532zM5.864 2.658 16.8 8.99l-2.302 2.302-8.635-8.635z" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-white">Disponible sur</span>
                <span className="text-sm font-bold">Google Play</span>
              </div>
            </a>

            {/* Sortie de secours pour les visiteurs iOS, qui n'ont aucune app
                à télécharger : sans ce lien, la section est un cul-de-sac. */}
            <Link
              href="/restaurants"
              data-analytics-id="order_cta_click"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-100 px-5 py-3 text-sm font-bold text-ink-900 transition-colors hover:bg-tomato-50"
            >
              Ou commander sur le site
            </Link>
          </div>

          <p className="mt-4 text-sm text-ink-500">
            Application Android disponible. Version iOS en préparation.
          </p>
        </div>

        {/* Mockup phone */}
        <div className="relative h-[20rem] w-[16rem] shrink-0 sm:h-[24rem] sm:w-[19rem]">
          {/* Pas de `priority` : cette image est en bas de page. Le préchargement
              la mettait en concurrence avec la bannière du hero, qui est la
              véritable LCP. */}
          <Image
            src="/phone-mockup1.png"
            alt="L&apos;application Lilia Food affichée sur un téléphone"
            fill
            sizes="(max-width: 640px) 256px, 304px"
            className="object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
