'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  useMyRestaurant, useRestaurants, useProducts, useCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Product, ProductVariant, Category } from '@lilia/types';
import { Plus, Pencil, Trash2, X, Package, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VariantDraft { _key: number; id?: string; label: string; prix: string }
interface ProductForm {
  nom: string; description: string; imageUrl: string;
  prixOriginal: string; categoryId: string; stockQuotidien: string;
  variants: VariantDraft[];
}

const EMPTY_FORM: ProductForm = {
  nom: '', description: '', imageUrl: '', prixOriginal: '',
  categoryId: '', stockQuotidien: '', variants: [],
};

type PanelState = null | { mode: 'create' } | { mode: 'edit'; product: Product };

// ─── Helpers ────────────────────────────────────────────────────────────────

function initForm(p?: Product): ProductForm {
  if (!p) return { ...EMPTY_FORM, variants: [{ _key: Date.now(), label: '', prix: '' }] };
  return {
    nom:          p.nom,
    description:  p.description ?? '',
    imageUrl:     p.imageUrl    ?? '',
    prixOriginal: String(p.prixOriginal),
    categoryId:   p.categoryId  ?? '',
    stockQuotidien: p.stockQuotidien != null ? String(p.stockQuotidien) : '',
    variants: p.variants.length
      ? p.variants.map((v, i) => ({ _key: i, id: v.id, label: v.label ?? '', prix: String(v.prix) }))
      : [{ _key: Date.now(), label: '', prix: '' }],
  };
}

function stockLabel(p: Product) {
  if (p.stockQuotidien == null) return 'Illimité';
  if ((p.stockRestant ?? 0) === 0) return 'Rupture';
  return `${p.stockRestant}/${p.stockQuotidien}`;
}

function stockColor(p: Product) {
  if (p.stockQuotidien == null) return 'text-zinc-400';
  if ((p.stockRestant ?? 0) === 0) return 'text-red-500 font-medium';
  if ((p.stockRestant ?? 0) <= 3) return 'text-amber-500 font-medium';
  return 'text-emerald-600 dark:text-emerald-400';
}

// ─── Side panel ─────────────────────────────────────────────────────────────

function ProductPanel({
  panel, categories, onClose,
  onSave, isSaving,
}: {
  panel: Exclude<PanelState, null>;
  categories: Category[];
  onClose: () => void;
  onSave: (form: ProductForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ProductForm>(() =>
    initForm(panel.mode === 'edit' ? panel.product : undefined),
  );

  const set = (k: keyof ProductForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  function addVariant() {
    setForm(f => ({ ...f, variants: [...f.variants, { _key: Date.now(), label: '', prix: '' }] }));
  }
  function removeVariant(key: number) {
    setForm(f => ({ ...f, variants: f.variants.filter(v => v._key !== key) }));
  }
  function setVariant(key: number, field: 'label' | 'prix', val: string) {
    setForm(f => ({ ...f, variants: f.variants.map(v => v._key === key ? { ...v, [field]: val } : v) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prixOriginal) {
      toast.error('Nom et prix sont requis');
      return;
    }
    onSave(form);
  }

  const title = panel.mode === 'create' ? 'Nouveau produit' : 'Modifier le produit';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white dark:bg-dark-card border-l border-zinc-200 dark:border-dark-border h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image preview */}
          {form.imageUrl && (
            <div className="w-full h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
              <Image src={form.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">URL image</label>
            <input
              value={form.imageUrl}
              onChange={e => set('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nom *</label>
            <input
              required value={form.nom}
              onChange={e => set('nom', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Prix de base (FCFA) *</label>
              <input
                required type="number" min="0" value={form.prixOriginal}
                onChange={e => set('prixOriginal', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Stock quotidien</label>
              <input
                type="number" min="0" value={form.stockQuotidien}
                onChange={e => set('stockQuotidien', e.target.value)}
                placeholder="Illimité"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Catégorie</label>
              <select
                value={form.categoryId}
                onChange={e => set('categoryId', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="">Sans catégorie</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          )}

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Variantes <span className="text-zinc-400">(taille, format…)</span>
              </label>
              <button
                type="button" onClick={addVariant}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {form.variants.map(v => (
                <div key={v._key} className="flex items-center gap-2">
                  <input
                    value={v.label}
                    onChange={e => setVariant(v._key, 'label', e.target.value)}
                    placeholder="Label (ex: 30cl)"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                  <input
                    type="number" min="0" value={v.prix}
                    onChange={e => setVariant(v._key, 'prix', e.target.value)}
                    placeholder="Prix"
                    className="w-24 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                  <button
                    type="button" onClick={() => removeVariant(v._key)}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-dark-border shrink-0 flex gap-3">
          <button
            type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit" disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showVariants, setShowVariants] = useState(false);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      {/* Image */}
      <div className="h-36 bg-zinc-100 dark:bg-zinc-800 relative">
        {product.imageUrl
          ? <Image src={product.imageUrl} alt={product.nom} fill className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        }
        {product.categoryId && product.category && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 font-medium">
            {product.category.nom}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{product.nom}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
            {product.prixOriginal.toLocaleString('fr-FR')}
            <span className="text-xs font-normal text-zinc-400 ml-0.5">FCFA</span>
          </p>
        </div>

        {product.description && (
          <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-1 text-zinc-400">
            <Package size={11} />
            <span className={stockColor(product)}>{stockLabel(product)}</span>
          </div>
          {product.variants.length > 0 && (
            <button
              onClick={() => setShowVariants(v => !v)}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              {product.variants.length} variante{product.variants.length > 1 ? 's' : ''}
              {showVariants ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>

        {showVariants && product.variants.length > 0 && (
          <div className="mb-3 space-y-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2">
            {product.variants.map((v: ProductVariant) => (
              <div key={v.id} className="flex justify-between text-xs">
                <span className="text-zinc-500">{v.label || 'Standard'}</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {v.prix.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Pencil size={12} /> Modifier
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProduitsPage() {
  const { token } = useAuthStore();
  const [panel, setPanel]         = useState<PanelState>(null);
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  // Récupère le restaurant propre à l'utilisateur (RESTAURATEUR) ou null (ADMIN)
  const { data: rawMine, isError: noOwnRestaurant } = useMyRestaurant(token);
  const mine = rawMine as { id: string; nom: string } | undefined;

  // Pour les ADMINs sans restaurant attaché, on propose la liste complète
  const { data: allRestaurants = [] } = useRestaurants();

  // Restaurant actif : celui de l'utilisateur si RESTAURATEUR, sinon celui sélectionné dans le dropdown
  const restaurantId = mine?.id ?? selectedRestaurantId;

  // Pré-sélectionner le premier restaurant dès qu'ils sont chargés (ADMIN)
  if (!mine && !selectedRestaurantId && allRestaurants.length > 0) {
    setSelectedRestaurantId((allRestaurants[0] as { id: string }).id);
  }

  const { data: products = [], isLoading } = useProducts(restaurantId || undefined);
  const { data: categories = [] }          = useCategories(restaurantId || undefined);

  const { mutate: createProduct, isPending: creating } = useCreateProduct(token);
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct(token);
  const { mutate: deleteProduct, isPending: deleting } = useDeleteProduct(token);

  const filtered = filterCat === 'ALL'
    ? products
    : products.filter((p: Product) => p.categoryId === filterCat);

  function handleSave(form: ProductForm) {
    const payload = {
      nom:           form.nom.trim(),
      description:   form.description.trim() || undefined,
      imageUrl:      form.imageUrl.trim()    || undefined,
      prixOriginal:  parseFloat(form.prixOriginal),
      categoryId:    form.categoryId         || undefined,
      stockQuotidien: form.stockQuotidien ? parseInt(form.stockQuotidien) : undefined,
      variants: form.variants
        .filter(v => v.prix)
        .map(v => ({ id: v.id, label: v.label.trim() || undefined, prix: parseFloat(v.prix) })),
    };

    if (panel?.mode === 'create') {
      createProduct(payload, {
        onSuccess: () => { toast.success('Produit créé'); setPanel(null); },
        onError:   () => toast.error('Erreur lors de la création'),
      });
    } else if (panel?.mode === 'edit') {
      updateProduct({ id: panel.product.id, data: payload }, {
        onSuccess: () => { toast.success('Produit mis à jour'); setPanel(null); },
        onError:   () => toast.error('Erreur lors de la mise à jour'),
      });
    }
  }

  function handleDelete(product: Product) {
    deleteProduct(product.id, {
      onSuccess: () => { toast.success('Produit supprimé'); setConfirmDelete(null); },
      onError:   () => toast.error('Erreur lors de la suppression'),
    });
  }

  return (
    <div className="max-w-6xl space-y-4">
      {/* Sélecteur de restaurant (ADMIN uniquement) */}
      {!mine && allRestaurants.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Restaurant :</label>
          <select
            value={selectedRestaurantId}
            onChange={e => { setSelectedRestaurantId(e.target.value); setFilterCat('ALL'); }}
            className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            {allRestaurants.map((r: { id: string; nom: string }) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          <button
            onClick={() => setFilterCat('ALL')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterCat === 'ALL'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Tout ({products.length})
          </button>
          {categories.map((c: Category) => {
            const count = products.filter((p: Product) => p.categoryId === c.id).length;
            if (count === 0) return null;
            return (
              <button
                key={c.id}
                onClick={() => setFilterCat(c.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterCat === c.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {c.nom} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setPanel({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus size={15} /> Nouveau produit
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-400 text-sm">
            {products.length === 0 ? 'Aucun produit. Commencez par en créer un.' : 'Aucun produit dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p: Product) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => setPanel({ mode: 'edit', product: p })}
              onDelete={() => setConfirmDelete(p)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit panel */}
      {panel && (
        <ProductPanel
          panel={panel}
          categories={categories}
          onClose={() => setPanel(null)}
          onSave={handleSave}
          isSaving={creating || updating}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Supprimer le produit ?</h3>
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
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
