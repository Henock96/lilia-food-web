'use client';

import { useState } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from '@lilia/api-client';
import type { Category } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useCatalogScope } from '@/lib/use-catalog-scope';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, X, Tag, AlertCircle, ChevronUp, ChevronDown, Eye, EyeOff,
} from 'lucide-react';

/**
 * Sections de menu — **propriété du vendeur**.
 *
 * Trois choses ont changé par rapport à la version « catégories globales » :
 *
 *  1. une section vide **reste affichée**. Le filtre précédent (« celles qui ont
 *     déjà un produit ») faisait disparaître une section à la seconde où on la
 *     créait, et masquait le sélecteur du formulaire produit : plus aucun
 *     premier produit ne pouvait être classé ;
 *  2. la suppression est ouverte au propriétaire et **ne supprime aucun
 *     produit** — ils sont détachés et restent en vente ;
 *  3. l'ordre est décidé par le vendeur, et les clients le respectent.
 */

type CategoryRow = Category & { _count?: { products: number } };
type Dialog = null | { mode: 'create' } | { mode: 'edit'; category: CategoryRow };

function CategoryDialog({
  dialog, token, targetRestaurantId, onClose,
}: {
  dialog: Exclude<Dialog, null>;
  token: string | null;
  targetRestaurantId: string | undefined;
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
      toast.success(dialog.mode === 'create' ? 'Section créée' : 'Section renommée');
      onClose();
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");

    if (dialog.mode === 'create') {
      // `restaurantId` n'est joint que pour un ADMIN — le backend le refuse
      // d'un RESTAURATEUR et déduit alors son vendeur du compte authentifié.
      create.mutate({ nom: value, restaurantId: targetRestaurantId }, { onSuccess, onError });
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
            {dialog.mode === 'create' ? 'Nouvelle section' : 'Renommer la section'}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          value={nom}
          maxLength={60}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Plats, Boissons, Spécialités Maison…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <p className="text-[11px] text-zinc-400 mt-2">
          Cette section n&apos;appartient qu&apos;à ce commerce. Un autre vendeur peut avoir le même nom.
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
  const scope = useCatalogScope();

  const { data: categories = [], isLoading } = useCategories(scope.restaurantId, token);
  const deleteCategory = useDeleteCategory(token);
  const updateCategory = useUpdateCategory(token);
  const reorder = useReorderCategories(token);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null);

  if (scope.noRestaurant) {
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

  const rows = categories as CategoryRow[];

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= rows.length) return;
    const ids = rows.map((c) => c.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    // Liste ordonnée complète : c'est le contrat du backend, et c'est ce qui
    // rend deux réordonnancements concurrents inoffensifs.
    reorder.mutate(
      { categoryIds: ids, restaurantId: scope.targetRestaurantId },
      { onError: () => toast.error("L'ordre n'a pas pu être enregistré") },
    );
  }

  function toggleActive(c: CategoryRow) {
    const count = c._count?.products ?? 0;
    updateCategory.mutate(
      { id: c.id, isActive: !c.isActive },
      {
        onSuccess: () =>
          toast.success(
            c.isActive
              ? count > 0
                ? `Section masquée — ${count} produit(s) apparaîtront dans « Autres »`
                : 'Section masquée'
              : 'Section affichée',
          ),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
      },
    );
  }

  function handleDelete(category: CategoryRow) {
    deleteCategory.mutate(category.id, {
      onSuccess: () => { toast.success('Section supprimée'); setConfirmDelete(null); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression'),
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {scope.isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Vendeur :</label>
            <select
              value={scope.restaurantId ?? ''}
              onChange={(e) => scope.select(e.target.value || null)}
              className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {scope.vendors.map((r) => (
                <option key={r.id} value={r.id}>
                  {/* Le statut est affiché : l'admin remplit souvent le catalogue
                      d'un vendeur encore invisible du public. */}
                  {r.onboardingStatus && r.onboardingStatus !== 'ACTIVATED'
                    ? `${r.nom} · ${r.onboardingStatus}`
                    : r.nom}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setDialog({ mode: 'create' })}
          disabled={scope.needsVendor}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shrink-0 disabled:opacity-50"
        >
          <Plus size={15} /> Nouvelle section
        </button>
      </div>

      {scope.needsVendor ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sélectionnez un vendeur pour voir ses sections.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-10 text-center">
          <Tag className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" size={32} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune section. Créez-en une pour organiser la carte.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card divide-y divide-zinc-100 dark:divide-dark-border overflow-hidden">
          {rows.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => move(i, -1)} disabled={i === 0}
                  className="p-0.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-25"
                  title="Monter" aria-label="Monter"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                  className="p-0.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-25"
                  title="Descendre" aria-label="Descendre"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                c.isActive === false
                  ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800'
                  : 'bg-primary-500/10 text-primary-500'
              }`}>
                <Tag size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  c.isActive === false
                    ? 'text-zinc-400 line-through'
                    : 'text-zinc-800 dark:text-zinc-200'
                }`}>
                  {c.nom}
                </p>
                <p className="text-xs text-zinc-400">
                  {c._count ? `${c._count.products} produit${c._count.products > 1 ? 's' : ''}` : ''}
                  {c.isActive === false ? ' · masquée aux clients' : ''}
                </p>
              </div>
              <button
                onClick={() => toggleActive(c)}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={c.isActive === false ? 'Afficher aux clients' : 'Masquer aux clients'}
              >
                {c.isActive === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => setDialog({ mode: 'edit', category: c })}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Renommer"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(c)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <CategoryDialog
          dialog={dialog}
          token={token}
          targetRestaurantId={scope.targetRestaurantId}
          onClose={() => setDialog(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Supprimer « {confirmDelete.nom} » ?
            </h3>
            <p className="text-sm text-zinc-500 mb-5">
              {(confirmDelete._count?.products ?? 0) > 0
                ? `${confirmDelete._count!.products} produit(s) resteront en vente, sans section, et apparaîtront dans « Autres ». Aucun produit n'est supprimé.`
                : 'Cette section est vide.'}
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
