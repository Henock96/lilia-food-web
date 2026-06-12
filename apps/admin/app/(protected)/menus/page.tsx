'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  useMyMenus, useMenus, useCreateMenu, useUpdateMenu, useToggleMenu, useDeleteMenu,
  useProducts, useRestaurants,
} from '@lilia/api-client';
import type { MenuDuJour, MenuType, Product, Restaurant } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin, useMyRestaurantScoped } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, X, UtensilsCrossed, ImageIcon, AlertCircle, Check,
} from 'lucide-react';

// ─── Form ─────────────────────────────────────────────────────────────────

interface MenuForm {
  nom: string;
  description: string;
  prix: string;
  type: MenuType;
  ingredients: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD
  isActive: boolean;
  productIds: string[];
}

function todayISODate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function initForm(menu?: MenuDuJour): MenuForm {
  if (!menu) {
    return {
      nom: '', description: '', prix: '', type: 'COMBO', ingredients: '',
      dateDebut: todayISODate(), dateFin: todayISODate(), isActive: true, productIds: [],
    };
  }
  return {
    nom: menu.nom,
    description: menu.description ?? '',
    prix: String(menu.prix),
    type: menu.type,
    ingredients: menu.ingredients ?? '',
    dateDebut: menu.dateDebut.slice(0, 10),
    dateFin: menu.dateFin.slice(0, 10),
    isActive: menu.isActive,
    productIds: (menu.products ?? []).map((p) => p.productId),
  };
}

type Panel = null | { mode: 'create' } | { mode: 'edit'; menu: MenuDuJour };

function MenuPanel({
  panel, products, token, onClose, onSaved,
}: {
  panel: Exclude<Panel, null>;
  products: Product[];
  token: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MenuForm>(() =>
    initForm(panel.mode === 'edit' ? panel.menu : undefined),
  );
  const create = useCreateMenu(token);
  const update = useUpdateMenu(token);
  const saving = create.isPending || update.isPending;

  function set<K extends keyof MenuForm>(k: K, v: MenuForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((p) => p !== id)
        : [...f.productIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prix) {
      toast.error('Nom et prix sont requis');
      return;
    }
    if (form.type === 'COMBO' && form.productIds.length === 0) {
      toast.error('Un menu COMBO doit contenir au moins un produit');
      return;
    }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) {
      toast.error('La date de fin doit suivre la date de début');
      return;
    }

    const payload: Record<string, unknown> = {
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      prix: parseFloat(form.prix),
      type: form.type,
      dateDebut: new Date(form.dateDebut).toISOString(),
      dateFin: new Date(form.dateFin).toISOString(),
      isActive: form.isActive,
    };
    if (form.type === 'PLAT_SPECIAL') {
      payload.ingredients = form.ingredients.trim() || undefined;
    } else {
      payload.products = form.productIds.map((productId, i) => ({ productId, ordre: i }));
    }

    const onSuccess = () => {
      toast.success(panel.mode === 'create' ? 'Menu créé' : 'Menu mis à jour');
      onSaved();
    };
    const onError = (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');

    if (panel.mode === 'create') {
      create.mutate(payload, { onSuccess, onError });
    } else {
      update.mutate({ id: panel.menu.id, data: payload }, { onSuccess, onError });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white dark:bg-dark-card border-l border-zinc-200 dark:border-dark-border h-full flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {panel.mode === 'create' ? 'Nouveau menu' : 'Modifier le menu'}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            {(['COMBO', 'PLAT_SPECIAL'] as MenuType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.type === t
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {t === 'COMBO' ? 'Combo (multi-produits)' : 'Plat spécial'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nom *</label>
            <input
              required value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Prix (FCFA) *</label>
              <input
                required type="number" min="0" value={form.prix}
                onChange={(e) => set('prix', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Début</label>
              <input
                type="date" value={form.dateDebut}
                onChange={(e) => set('dateDebut', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fin</label>
              <input
                type="date" value={form.dateFin}
                onChange={(e) => set('dateFin', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          {/* PLAT_SPECIAL : composition libre */}
          {form.type === 'PLAT_SPECIAL' ? (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Composition / ingrédients
              </label>
              <textarea
                value={form.ingredients}
                onChange={(e) => set('ingredients', e.target.value)}
                rows={2}
                placeholder="Ex: Riz, poulet grillé, légumes sautés, sauce tomate"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
              />
            </div>
          ) : (
            // COMBO : sélection de produits
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Produits inclus * <span className="text-zinc-400">({form.productIds.length})</span>
              </label>
              {products.length === 0 ? (
                <p className="text-xs text-zinc-400">Aucun produit disponible. Créez d&apos;abord des produits.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {products.map((p) => {
                    const checked = form.productIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProduct(p.id)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {checked && <Check size={11} />}
                        </span>
                        <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">{p.nom}</span>
                        <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                          {p.prixOriginal.toLocaleString('fr-FR')} FCFA
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="accent-primary-500"
            />
            Menu actif (visible par les clients)
          </label>
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 dark:border-dark-border shrink-0 flex gap-3">
          <button
            type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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

// ─── Card ───────────────────────────────────────────────────────────────────

function MenuCard({
  menu, token, onEdit, onDelete,
}: {
  menu: MenuDuJour;
  token: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toggle = useToggleMenu(token);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="h-32 bg-zinc-100 dark:bg-zinc-800 relative">
        {menu.imageUrl
          ? <Image src={menu.imageUrl} alt={menu.nom} fill className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
          menu.isActive ? 'bg-emerald-500 text-white' : 'bg-zinc-800/80 text-zinc-300'
        }`}>
          {menu.isActive ? 'Actif' : 'Inactif'}
        </span>
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300">
          {menu.type === 'COMBO' ? 'Combo' : 'Plat spécial'}
        </span>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{menu.nom}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
            {menu.prix.toLocaleString('fr-FR')}<span className="text-xs font-normal text-zinc-400 ml-0.5">FCFA</span>
          </p>
        </div>
        {menu.description && <p className="text-xs text-zinc-400 line-clamp-1">{menu.description}</p>}
        <p className="text-xs text-zinc-400">
          {new Date(menu.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          {' → '}
          {new Date(menu.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          {menu.type === 'COMBO' && menu.products && ` · ${menu.products.length} produit${menu.products.length > 1 ? 's' : ''}`}
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => toggle.mutate(menu.id, {
              onSuccess: () => toast.success(menu.isActive ? 'Menu désactivé' : 'Menu activé'),
              onError: () => toast.error('Erreur lors du changement de statut'),
            })}
            disabled={toggle.isPending}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-60"
          >
            {menu.isActive ? 'Désactiver' : 'Activer'}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <Link
            href={`/menus/${menu.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Photos"
          >
            <ImageIcon size={12} />
          </Link>
          <button
            onClick={onDelete}
            className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MenusPage() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { restaurant, isError: noResto } = useMyRestaurantScoped(token);

  const { data: allRestaurants = [] } = useRestaurants();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const restaurantId = isAdmin ? (selectedRestaurantId || undefined) : restaurant?.id;

  // Pré-sélection du premier resto pour l'ADMIN
  if (isAdmin && !selectedRestaurantId && allRestaurants.length > 0) {
    setSelectedRestaurantId((allRestaurants[0] as Restaurant).id);
  }

  const myMenusQuery = useMyMenus(isAdmin ? null : token);
  const adminMenusQuery = useMenus(isAdmin ? restaurantId : undefined);
  const menus = isAdmin ? (adminMenusQuery.data ?? []) : (myMenusQuery.data ?? []);
  const isLoading = isAdmin ? adminMenusQuery.isLoading : myMenusQuery.isLoading;

  const { data: products = [] } = useProducts(restaurantId);
  const deleteMenu = useDeleteMenu(token);

  const [panel, setPanel] = useState<Panel>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuDuJour | null>(null);

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

  function handleDelete(menu: MenuDuJour) {
    deleteMenu.mutate(menu.id, {
      onSuccess: () => { toast.success('Menu supprimé'); setConfirmDelete(null); },
      onError: () => toast.error('Erreur lors de la suppression'),
    });
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && allRestaurants.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Restaurant :</label>
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {(allRestaurants as Restaurant[]).map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setPanel({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus size={15} /> Nouveau menu
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-10 text-center">
          <UtensilsCrossed className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" size={32} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucun menu du jour. Créez votre premier menu.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((m) => (
            <MenuCard
              key={m.id}
              menu={m}
              token={token}
              onEdit={() => setPanel({ mode: 'edit', menu: m })}
              onDelete={() => setConfirmDelete(m)}
            />
          ))}
        </div>
      )}

      {panel && (
        <MenuPanel
          panel={panel}
          products={products}
          token={token}
          onClose={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Supprimer le menu ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              <span className="font-medium">{confirmDelete.nom}</span> sera définitivement supprimé.
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
                disabled={deleteMenu.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
              >
                {deleteMenu.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
