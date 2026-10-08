import { Store, Smartphone, PackageCheck, type LucideIcon } from 'lucide-react';

/**
 * « Comment ça marche » — trois étapes, en texte.
 *
 * Avant : trois grandes photos en cartes avec zoom au survol (sur des
 * éléments non cliquables), dont un logo MTN plein cadre alors qu'Airtel
 * Money est aussi accepté, et deux promesses que la plateforme ne tient pas
 * partout : « livraison en 15 à 30 minutes » (les vendeurs annoncent de 10 à
 * 45 min) et un suivi « en temps réel » (le site affiche l'étape de la
 * commande, pas la position du livreur).
 *
 * Ici, un format éditorial numéroté, distinct des grilles de cartes qui
 * l'entourent, et des phrases qui décrivent le produit tel qu'il est.
 */
const STEPS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: 'Choisis ton vendeur',
    body: 'Parcours les vendeurs de Brazzaville par univers ou par nom. Leur carte, leurs horaires et les avis des clients sont affichés.',
    icon: Store,
  },
  {
    title: 'Paie en Mobile Money',
    body: 'MTN MoMo ou Airtel Money, depuis ton téléphone. Pas besoin de carte bancaire.',
    icon: Smartphone,
  },
  {
    title: 'Reçois ou récupère',
    body: 'Livraison chez toi ou retrait sur place, selon le vendeur, dans le délai qu’il annonce. Tu suis chaque étape depuis ton compte.',
    icon: PackageCheck,
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="comment-titre" className="border-y border-cream-300 bg-cream-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-16 lg:px-8 lg:py-20">
        <div>
          <h2
            id="comment-titre"
            className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
          >
            Comment ça marche
          </h2>
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            Trois étapes, du choix du vendeur à ta commande.
          </p>
        </div>

        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-tomato-600 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-extrabold text-tomato-700" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <step.icon className="h-6 w-6 text-ink-500" aria-hidden />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-ink-900">
                <span className="sr-only">Étape {i + 1} : </span>
                {step.title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
