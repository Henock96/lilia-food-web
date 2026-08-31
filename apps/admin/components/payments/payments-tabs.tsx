'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

/**
 * Bascule entre les deux moitiés de l'argent.
 *
 * *Encaisser le client* et *payer le vendeur* sont deux mouvements distincts,
 * à deux moments différents, décidés par deux acteurs différents. Les présenter
 * sur un seul écran mélangerait ce que la plateforme sépare avec soin — d'où
 * deux vues, et une bascule qui rappelle le sens de chaque flux.
 */
export function PaymentsTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      href: '/paiements',
      label: 'Encaissements',
      hint: 'Client → Lilia Food',
      icon: ArrowDownLeft,
    },
    {
      href: '/paiements/reversements',
      label: 'Reversements',
      hint: 'Lilia Food → Vendeur',
      icon: ArrowUpRight,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ href, label, hint, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors ${
              active
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-300 hover:border-zinc-300'
            }`}
          >
            <Icon size={15} className={active ? 'opacity-90' : 'opacity-60'} />
            <span className="font-medium">{label}</span>
            <span className={`text-[11px] ${active ? 'text-white/70' : 'text-zinc-400'}`}>
              {hint}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
