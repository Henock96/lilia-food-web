'use client';

import { UtensilsCrossed } from 'lucide-react';

// W10 — page liste menus encore à implémenter (nécessite un endpoint backend
// `GET /menus` côté admin). La gestion des photos par menu existe sur
// `/menus/[id]` mais reste à relier (depuis la future liste ou la fiche
// produit). Le lien codé en dur vers `/menus/example-id` (404 garanti) a été
// retiré.
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
          La gestion des menus du jour sera disponible ici prochainement.
        </p>
      </div>
    </div>
  );
}
