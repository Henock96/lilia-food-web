'use client';

import { useState } from 'react';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useRestaurants,
} from '@lilia/api-client';
import type { Category, Restaurant } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin, useMyRestaurantScoped } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Tag, AlertCircle } from 'lucide-react';

type CategoryRow = Category & { _count?: { products: number } };

type Dialog = null | { mode: 'create' } | { mode: 'edit'; category: CategoryRow };

/**
 * Page Catégories (LIL-108).
 *
 * ⚠️ Les catégories sont **globales** côté backend (partagées par toute la
 * plateforme). Le restaurateur voit celles utilisées par ses produits et peut
 * en créer / renommer. La **suppression est réservée à l'ADMIN** (backend
 * `@Roles('ADMIN')`) → bouton masqué pour le restaurateur.
 */
function CategoryDialog({
  dialog, token, onClose,
}: {
  dialog: Exclude<Dialog, null>;
  token: string | null;
  onClose: () => void;
}) {
  const [nom, setNom] = useState(dialog.mode === 'edit' ? dialog.category.nom : '');
  const create = useCreateCategory(token);
  const update = useUpdateCategory(token);
  const saving = create.isPending || update.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = nom.trim();
    if (!value) {
      toast.error('Le nom est requis');
      return;
    }
    const onSuccess = () => {
      toast.success(dialog.mode === 'create' ? 'Catégorie créée' : 'Catégorie mise à jour');
      onClose();
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');

    if (dialog.mode === 'create') {
      create.mutate(value, { onSuccess, onError });
    } else {
      update.mutate({ id: dialog.category.id, nom: value }, { onSuccess, onError });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {dialog.mode === 'create' ? 'Nouvelle catégorie' : 'Renommer la catégorie'}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Pizzas, Boissons, Desserts…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <p className="text-[11px] text-zinc-400 mt-2">
          Les catégories sont partagées par toute la plateforme Lilia.
        </p>
        <div className="flex gap-3 mt-5">
          <button
            type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CategoriesPage() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { restaurant, isError: noResto } = useMyRestaurantScoped(token);

  // ADMIN sélectionne un resto pour filtrer (ou voit tout) ; RESTAURATEUR est
  // limité au sien.
  const { data: allRestaurants = [] } = useRestaurants();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const restaurantId = isAdmin ? (selectedRestaurantId || undefined) : restaurant?.id;

  const { data: categories = [], isLoading } = useCategories(restaurantId);
  const deleteCategory = useDeleteCategory(token);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null);

  if (noResto) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Aucun restaurant attribué
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Contactez un administrateur Lilia pour finaliser votre activation.
        </p>
      </div>
    );
  }

  function handleDelete(category: CategoryRow) {
    deleteCategory.mutate(category.id, {
      onSuccess: () => { toast.success('Catégorie supprimée'); setConfirmDelete(null); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression'),
    });
  }

  const rows = categories as CategoryRow[];

  return (
    <div className="max-w-3xl space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && allRestaurants.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Restaurant :</label>
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <option value="">Toutes les catégories</option>
              {(allRestaurants as Restaurant[]).map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setDialog({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus size={15} /> Nouvelle catégorie
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-10 text-center">
          <Tag className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" size={32} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {restaurantId
              ? 'Aucune catégorie utilisée par ce restaurant. Créez-en une.'
              : 'Aucune catégorie. Commencez par en créer une.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card divide-y divide-zinc-100 dark:divide-dark-border overflow-hidden">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                <Tag size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.nom}</p>
                {c._count && (
                  <p className="text-xs text-zinc-400">
                    {c._count.products} produit{c._count.products > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDialog({ mode: 'edit', category: c })}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Renommer"
              >
                <Pencil size={14} />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && <CategoryDialog dialog={dialog} token={token} onClose={() => setDialog(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Supprimer la catégorie ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              <span className="font-medium">{confirmDelete.nom}</span> sera supprimée de la plateforme.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteCategory.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
              >
                {deleteCategory.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
