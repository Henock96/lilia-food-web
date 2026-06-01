'use client';

import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';

export default function MenusPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Menus du jour
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          La liste des menus arrive bientôt.
        </p>
      </header>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-8 text-center">
        <UtensilsCrossed
          className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
          size={32}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Liste des menus à venir — accède directement à{' '}
          <Link
            href="/menus/example-id"
            className="text-primary-500 hover:underline"
          >
            /menus/&lt;id&gt;
          </Link>{' '}
          pour gérer les photos d&apos;un menu.
        </p>
      </div>
    </div>
  );
}
