'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Search, ShoppingCart, Truck } from 'lucide-react';
import { staggerContainerVariants, scrollRevealVariants } from '@lilia/motion';

const steps = [
  {
    icon: Search,
    title: 'Choisissez un restaurant',
    description: 'Parcourez nos restaurants partenaires à Brazzaville et découvrez leurs menus.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    step: '01',
  },
  {
    icon: ShoppingCart,
    title: 'Composez votre commande',
    description: 'Ajoutez vos plats préférés au panier. Appliquez un code promo si vous en avez un.',
    color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    step: '02',
  },
  {
    icon: Truck,
    title: 'Recevez votre repas',
    description: 'Payez par MTN MoMo. Suivez votre commande en temps réel.',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    step: '03',
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section className="py-20 bg-white dark:bg-dark-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Comment ça marche ?
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Commander votre repas n'a jamais été aussi simple. En 3 étapes, c'est dans votre assiette.
          </p>
        </motion.div>

        <motion.div
          variants={reduced ? {} : staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              variants={reduced ? {} : scrollRevealVariants}
              className="relative flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-100 dark:border-dark-border bg-zinc-50/50 dark:bg-dark-card hover:border-zinc-200 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-dark-surface transition-all group"
            >
              <span className="absolute top-4 right-4 text-5xl font-black text-zinc-100 dark:text-dark-border group-hover:text-zinc-200 dark:group-hover:text-zinc-700 transition-colors select-none" aria-hidden>
                {step.step}
              </span>
              <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center mb-5`}>
                <step.icon className="w-7 h-7" aria-hidden />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg mb-3">{step.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.description}</p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-zinc-200 dark:bg-dark-border" aria-hidden />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
