const STEPS = [
  {
    title: 'Choisis ton vendeur',
    description: 'Restaurants, cuisines maison, boulangeries près de chez toi.',
  },
  {
    title: 'Paie en Mobile Money',
    description: 'MTN MoMo ou Airtel Money, confirmé en quelques minutes.',
  },
  {
    title: 'On te livre',
    description: "Suivi de la commande jusqu'à ta porte.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cream-200 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tomato-600 text-xs font-extrabold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-[11.5px] text-ink-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
