import { Store, Smartphone, PackageCheck, type LucideIcon } from 'lucide-react';

const STEPS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: 'Choisis tes plats',
    body: 'Trouve un vendeur par nom ou par catégorie, consulte sa carte et ajoute tes plats au panier. Choisis les formats ou les suppléments proposés.',
    icon: Store,
  },
  {
    title: 'Valide et paie ta commande',
    body: 'Choisis la livraison ou le retrait selon les options du vendeur. Vérifie le total, puis suis les instructions de paiement MTN MoMo ou Airtel Money sur ton téléphone.',
    icon: Smartphone,
  },
  {
    title: 'Suis ta commande',
    body: 'Consulte le statut dans « Mes commandes ». En livraison, le livreur t’apporte la commande à l’adresse indiquée. En retrait, récupère-la chez le vendeur quand elle est prête.',
    icon: PackageCheck,
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="comment-titre" className="border-y border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3.6fr)] lg:gap-10 lg:px-8 lg:py-14">
        <div>
          <h2
            id="comment-titre"
            className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
          >
            Comment ça marche
          </h2>
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            Du choix des plats à la livraison ou au retrait.
          </p>
        </div>

        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-tomato-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-extrabold text-tomato-700" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <step.icon className="h-5 w-5 text-tomato-700" aria-hidden />
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
