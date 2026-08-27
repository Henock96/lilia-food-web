import Image from 'next/image';

const STEPS = [
  {
    title: 'Choisis ton vendeur',
    description: 'Parcoure les restaurants, cuisines maison et boulangeries de ton quartier. Filtre par type de cuisine, consulte les menus et les avis — trouve ton plat en quelques secondes.',
    image: '/how-it-works/step1.jpeg',
    color: 'bg-cream-100',
  },
  {
    title: 'Paie en Mobile Money',
    description: 'Pas de carte bancaire ? Pas de problème. Paye directement avec MTN MoMo ou Airtel Money. Le paiement est sécurisé et confirmé en quelques secondes.',
    image: '/how-it-works/step2.png',
    color: 'bg-tomato-50',
  },
  {
    title: 'On te livre',
    description: "Un livreur récupère ta commande et l'apporte directement chez toi. Suis ta commande en temps réel, de la préparation jusqu'à ta porte — livraison en 15 à 30 minutes.",
    image: '/how-it-works/step4.jpeg',
    color: 'bg-cream-200',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cream-200 py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
            Comment ça marche ?
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Trois étapes simples pour te faire livrer.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`group overflow-hidden rounded-2xl ${step.color} transition-shadow hover:shadow-lg`}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden sm:h-56">
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Numéro badge */}
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-tomato-600 text-sm font-extrabold text-white shadow-md">
                  {i + 1}
                </span>
              </div>

              {/* Texte */}
              <div className="p-5">
                <h3 className="font-display text-base font-bold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
