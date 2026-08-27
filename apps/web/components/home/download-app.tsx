import Image from 'next/image';

/**
 * Section « Télécharger l'app » — inspirée du bandeau Glovo.
 * Fond `tomato-600`, mockup phone à droite, titre + boutons store à gauche.
 *
 * `tomato-600` (#D2371A) atteint 4,88:1 avec du blanc plein — passe le
 * seuil AA pour le paragraphe en 13 px. Pas d'`opacity-*` sur le texte.
 */
export function DownloadApp() {
  return (
    <section className="overflow-hidden bg-tomato-600 py-12 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* Texte + boutons */}
        <div className="max-w-md text-center lg:text-left">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Mieux avec notre app
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
            Commande en un clic, suis ta livraison en temps réel et paye par
            Mobile Money — tout est plus simple sur l&apos;appli Lilia Food.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {/* App Store */}
            <a
              href="https://apps.apple.com/app/lilia-food/id000000000"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Télécharger sur l'App Store"
              className="inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-5 py-3 text-white transition-colors hover:bg-ink-800"
            >
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-medium text-white/70">Télécharger sur</span>
                <span className="text-sm font-bold">App Store</span>
              </div>
            </a>

            {/* Google Play */}
            <a
              href="https://play.google.com/store/apps/details?id=com.lilia.food"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Disponible sur Google Play"
              className="inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-5 py-3 text-white transition-colors hover:bg-ink-800"
            >
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199 2.302 1.33a1 1 0 0 1 0 1.724l-2.302 1.33-2.532-2.532 2.532-2.532zM5.864 2.658 16.8 8.99l-2.302 2.302-8.635-8.635z" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-medium text-white/70">Disponible sur</span>
                <span className="text-sm font-bold">Google Play</span>
              </div>
            </a>
          </div>
        </div>

        {/* Mockup phone */}
        <div className="relative h-[20rem] w-[16rem] shrink-0 sm:h-[24rem] sm:w-[19rem]">
          <div className="absolute inset-0 rounded-[2.5rem] bg-ink-900/20" />
          <Image
            src="/phone-mockup1.png"
            alt="L&apos;application Lilia Food sur un téléphone"
            fill
            sizes="300px"
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}
