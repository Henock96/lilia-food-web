'use client';

import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { UserMenu } from '@/components/layout/user-menu';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/commandes': 'Commandes',
  '/restaurants': 'Restaurants',
  '/clients': 'Clients',
  '/paiements': 'Paiements',
  '/livreurs': 'Livreurs',
  '/zones': 'Zones',
  '/parametres': 'Paramètres',
  '/utilisateurs': 'Utilisateurs',
  '/profil': 'Mon profil',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();

  const title = Object.entries(pageTitles).find(([k]) =>
    pathname === k || pathname.startsWith(k + '/')
  )?.[1] ?? 'Admin';

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Changer le thème"
        >
          {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {/* Profil et déconnexion — à une place fixe, indépendante du nombre
            d'entrées de la navigation. */}
        <UserMenu />
      </div>
    </header>
  );
}
