'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  useProducts, useCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct, useSetProductAvailability, createPhoto,
} from '@lilia/api-client';
import { ProductImageBuffer, type DraftImage } from '@/components/product-image-buffer';
import { PhotoGalleryEditor } from '@/components/photo-gallery-editor';
import { useAuthStore } from '@/store/auth';
import { useCatalogScope } from '@/lib/use-catalog-scope';
import { apiMessage } from '@/lib/api-message';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type {
  Product,
  ProductVariant,
  Category,
  ProductType,
  StockMode,
  VendorType,
} from '@lilia/types';
import { Plus, Pencil, Trash2, X, Package, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VariantDraft { _key: number; id?: string; label: string; prix: string }
interface ProductForm {
  nom: string; description: string; imageUrl: string;
  prixOriginal: string; categoryId: string; stockQuotidien: string;
  variants: VariantDraft[];
  // Multi-vendeurs (LIL-116)
  productType: ProductType | '';
  stockMode: StockMode | '';
  ingredients: string;
  shelfLifeDays: string;
  madeToOrder: boolean;
  availableFrom: string;
  availableUntil: string;
}

const EMPTY_FORM: ProductForm = {
  nom: '', description: '', imageUrl: '', prixOriginal: '',
  categoryId: '', stockQuotidien: '', variants: [],
  productType: '', stockMode: '', ingredients: '', shelfLifeDays: '',
  madeToOrder: false, availableFrom: '', availableUntil: '',
};

/**
 * Types de produits autorisés par type de vendeur (LIL-114).
 * Aligné sur la matrice côté backend ProductValidatorService.
 * ALCOHOL est exclu partout (pivot — pas de vente d'alcool au lancement).
 */
const VENDOR_PRODUCT_OPTIONS: Record<VendorType, ProductType[]> = {
  RESTAURANT: ['FOOD', 'BEVERAGE'],
  HOME_COOK: ['FOOD', 'PASTRY'],
  BAKERY: ['PASTRY', 'FOOD'],
  BEVERAGE_SHOP: ['BEVERAGE'],
  GROCERY: ['GROCERY', 'BEVERAGE'],
};

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  FOOD: 'Plat / Repas',
  BEVERAGE: 'Boisson',
  PASTRY: 'Pâtisserie / Viennoiserie',
  GROCERY: 'Épicerie',
  ALCOHOL: 'Alcool',
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
    productType:   p.productType   ?? '',
    stockMode:     p.stockMode     ?? '',
    ingredients:   p.ingredients   ?? '',
    shelfLifeDays: p.shelfLifeDays != null ? String(p.shelfLifeDays) : '',
    madeToOrder:   p.madeToOrder   ?? false,
    availableFrom:  p.availableFrom  ?? '',
    availableUntil: p.availableUntil ?? '',
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
  panel, categories, vendorType, token, onClose,
  onSave, isSaving,
}: {
  panel: Exclude<PanelState, null>;
  categories: Category[];
  vendorType: VendorType;
  token: string | null;
  onClose: () => void;
  onSave: (form: ProductForm, buffer: DraftImage[]) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ProductForm>(() =>
    initForm(panel.mode === 'edit' ? panel.product : undefined),
  );
  const [buffer, setBuffer] = useState<DraftImage[]>([]);

  function set<K extends keyof ProductForm>(k: K, v: ProductForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

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
    onSave(form, buffer);
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
          {/* Galerie : buffer en création, galerie live en édition */}
          {panel.mode === 'create' ? (
            <ProductImageBuffer value={buffer} onChange={setBuffer} />
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Photos
              </label>
              <PhotoGalleryEditor entity="product" parentId={panel.product.id} token={token} />
            </div>
          )}

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

          {/* Le sélecteur est TOUJOURS rendu : le masquer quand la liste était
              vide empêchait de classer le premier produit d'un vendeur neuf.
              La liste ne peut plus l'être (sections par défaut), mais la règle
              vaut d'être écrite — une section reste facultative. */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Section de menu <span className="text-zinc-400">(facultatif)</span>
            </label>
            <select
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <option value="">Sans section — apparaîtra dans « Autres »</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Multi-vendeurs : type produit + mode stock (LIL-116) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Type de produit
              </label>
              <select
                value={form.productType}
                onChange={e => set('productType', e.target.value as ProductType | '')}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="">Auto (FOOD)</option>
                {VENDOR_PRODUCT_OPTIONS[vendorType].map(t => (
                  <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Filtré selon le type de vendeur ({vendorType}).
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Mode de stock
              </label>
              <select
                value={form.stockMode}
                onChange={e => set('stockMode', e.target.value as StockMode | '')}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="">Auto (DAILY)</option>
                <option value="DAILY">DAILY — reset chaque nuit</option>
                <option value="PERMANENT">PERMANENT — stock réel</option>
              </select>
            </div>
          </div>

          {/* Champs spécifiques HOME_COOK / BAKERY */}
          {(vendorType === 'HOME_COOK' || vendorType === 'BAKERY') && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Ingrédients (info allergènes)
                </label>
                <textarea
                  value={form.ingredients}
                  onChange={e => set('ingredients', e.target.value)}
                  rows={2}
                  placeholder="Ex: farine, beurre, œufs, noisettes"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Conservation (jours)
                  </label>
                  <input
                    type="number" min="1" value={form.shelfLifeDays}
                    onChange={e => set('shelfLifeDays', e.target.value)}
                    placeholder="Ex: 3"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.madeToOrder}
                      onChange={e => set('madeToOrder', e.target.checked)}
                      className="accent-primary-500"
                    />
                    Sur commande uniquement
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Fenêtre horaire (BAKERY surtout) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Disponible dès (HH:mm)
              </label>
              <input
                type="time" value={form.availableFrom}
                onChange={e => set('availableFrom', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Jusqu&apos;à (HH:mm)
              </label>
              <input
                type="time" value={form.availableUntil}
                onChange={e => set('availableUntil', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

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
  onToggleAvailability,
  togglingAvailability,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: () => void;
  togglingAvailability: boolean;
}) {
  const [showVariants, setShowVariants] = useState(false);
  // Les réponses antérieures au champ ne le portent pas : un produit servi
  // sans `isAvailable` est en vente, sans quoi il n'aurait pas été servi.
  const isAvailable = product.isAvailable !== false;

  return (
    <div className={`bg-white dark:bg-dark-card rounded-2xl border shadow-card overflow-hidden ${
      isAvailable
        ? 'border-zinc-200 dark:border-dark-border'
        : 'border-amber-300 dark:border-amber-500/40'
    }`}>
      {/* Image */}
      <div className="h-36 bg-zinc-100 dark:bg-zinc-800 relative">
        {product.imageUrl
          ? <Image src={product.imageUrl} alt={product.nom} fill className={`object-cover ${isAvailable ? '' : 'opacity-50'}`} />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        }
        {product.categoryId && product.category && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 font-medium">
            {product.category.nom}
          </span>
        )}
        {/* « Retiré de la vente » et « épuisé » sont deux états distincts : le
            premier est une décision du vendeur, le second une conséquence du
            stock. Les confondre trompait le client comme le gestionnaire. */}
        {!isAvailable && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
            Retiré de la vente
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
            onClick={onToggleAvailability}
            disabled={togglingAvailability}
            title={isAvailable ? 'Retirer de la vente' : 'Remettre en vente'}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
              isAvailable
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
            }`}
          >
            {isAvailable ? <EyeOff size={12} /> : <Eye size={12} />}
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

  // Périmètre catalogue : son vendeur (RESTAURATEUR) ou celui sélectionné
  // (ADMIN). C'est lui qui porte AUSSI le `restaurantId` d'écriture — le
  // sélecteur ne pilotait jusqu'ici que les listes, si bien qu'un ADMIN, qui ne
  // possède aucun vendeur, ne pouvait créer aucun produit.
  const scope = useCatalogScope();
  const restaurantId = scope.restaurantId;

  // Type de vendeur actif — pilote la liste des productType proposés (LIL-116).
  const vendorType: VendorType = scope.activeVendor?.vendorType ?? 'RESTAURANT';

  const { data: products = [], isLoading, error: productsError } = useProducts(restaurantId, token);
  const { data: categories = [] }          = useCategories(restaurantId, token);

  // Un appel en échec rendait exactement le même écran qu'un catalogue vide
  // (« Aucun produit. Commencez par en créer un. »). C'est ce qui a laissé un
  // 400 de pagination passer pour un problème de données pendant des semaines.
  const loadError = scope.vendorsError ?? (productsError as Error | null);

  const { mutateAsync: createProductAsync, isPending: creating } = useCreateProduct(token);
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct(token);
  const { mutate: deleteProduct, isPending: deleting } = useDeleteProduct(token);
  const { mutate: setAvailability, isPending: togglingAvailability } =
    useSetProductAvailability(token);

  const filtered = filterCat === 'ALL'
    ? products
    : products.filter((p: Product) => p.categoryId === filterCat);

  async function handleSave(form: ProductForm, buffer: DraftImage[]) {
    const payload: Record<string, unknown> = {
      nom:           form.nom.trim(),
      description:   form.description.trim() || undefined,
      prixOriginal:  parseFloat(form.prixOriginal),
      categoryId:    form.categoryId         || undefined,
      stockQuotidien: form.stockQuotidien ? parseInt(form.stockQuotidien) : undefined,
      variants: form.variants
        .filter(v => v.prix)
        .map(v => ({ id: v.id, label: v.label.trim() || undefined, prix: parseFloat(v.prix) })),
    };
    if (form.productType) payload.productType = form.productType;
    if (form.stockMode) payload.stockMode = form.stockMode;
    if (form.ingredients.trim()) payload.ingredients = form.ingredients.trim();
    if (form.shelfLifeDays) payload.shelfLifeDays = parseInt(form.shelfLifeDays, 10);
    if (form.madeToOrder) payload.madeToOrder = true;
    if (form.availableFrom) payload.availableFrom = form.availableFrom;
    if (form.availableUntil) payload.availableUntil = form.availableUntil;

    if (panel?.mode === 'create') {
      // La couverture du buffer alimente imageUrl (rétrocompat cartes).
      const cover = buffer.find(b => b.isCover) ?? buffer[0];
      payload.imageUrl = cover?.url ?? undefined;
      // ⚠️ Le champ manquait : sans lui le backend retombe sur « le vendeur de
      // l'appelant », qu'un ADMIN n'a pas — d'où « Vous devez posséder un
      // vendeur pour créer un produit ou un menu ». Il n'est joint que pour un
      // ADMIN : d'un RESTAURATEUR, le backend le refuse (403) plutôt que de le
      // remplacer en silence.
      if (scope.targetRestaurantId) payload.restaurantId = scope.targetRestaurantId;
      try {
        const created = await createProductAsync(payload);
        let failures = 0;
        for (const d of buffer) {
          try {
            await createPhoto('product', created.id, token, {
              url: d.url, publicId: d.publicId, isCover: d.isCover,
            });
          } catch {
            failures++;
          }
        }
        toast.success(failures > 0
          ? `Produit créé, ${failures} photo(s) non ajoutée(s) — réessayez en édition`
          : 'Produit créé');
        setPanel(null);
      } catch (err) {
        toast.error(apiMessage(err, 'Erreur lors de la création'));
      }
    } else if (panel?.mode === 'edit') {
      // En édition, la galerie live gère les images (et imageUrl côté backend).
      updateProduct({ id: panel.product.id, data: payload }, {
        onSuccess: () => { toast.success('Produit mis à jour'); setPanel(null); },
        onError:   (err) => toast.error(apiMessage(err, 'Erreur lors de la mise à jour')),
      });
    }
  }

  function handleToggleAvailability(product: Product) {
    const next = product.isAvailable === false;
    setAvailability({ id: product.id, isAvailable: next }, {
      onSuccess: () =>
        toast.success(next ? 'Produit remis en vente' : 'Produit retiré de la vente'),
      onError: (err) => toast.error(apiMessage(err, 'Erreur lors du changement de disponibilité')),
    });
  }

  function handleDelete(product: Product) {
    deleteProduct(product.id, {
      onSuccess: () => { toast.success('Produit supprimé'); setConfirmDelete(null); },
      onError:   (err) => toast.error(apiMessage(err, 'Erreur lors de la suppression')),
    });
  }

  return (
    <div className="max-w-6xl space-y-4">
      {/* Le message du serveur est affiché tel quel : il dit ce qui ne va pas
          (« limit ne peut pas dépasser 100 », « Vendeur introuvable »…) là où un
          libellé maison ne fait que constater l'échec. */}
      {loadError && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Le catalogue n&apos;a pas pu être chargé.
          </p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
            {loadError.message}
          </p>
        </div>
      )}

      {/* Sélecteur de vendeur (ADMIN uniquement) — alimenté par GET /admin/vendors,
          qui inclut les commerces en DRAFT : ce sont précisément ceux dont il
          faut remplir le catalogue pour pouvoir les activer. */}
      {scope.isAdmin && scope.vendors.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Vendeur :</label>
          <select
            value={restaurantId ?? ''}
            onChange={e => { scope.select(e.target.value || null); setFilterCat('ALL'); }}
            className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            {scope.vendors.map((r) => (
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
              onToggleAvailability={() => handleToggleAvailability(p)}
              togglingAvailability={togglingAvailability}
            />
          ))}
        </div>
      )}

      {/* Create / Edit panel */}
      {panel && (
        <ProductPanel
          panel={panel}
          categories={categories}
          vendorType={vendorType}
          token={token}
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
