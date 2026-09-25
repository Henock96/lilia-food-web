'use client';

import { useMemo, useState } from 'react';
import {
  useCreateModifierGroup,
  useDeleteModifierGroup,
  useModifierLibrary,
  useProducts,
  useReorderModifierGroups,
  useSetModifierOptionAvailability,
  useSetProductModifierGroups,
  useUpdateModifierGroup,
} from '@lilia/api-client';
import type { ModifierLibraryGroup, ModifierOptionInput, Product } from '@lilia/types';
import { toast } from 'sonner';
import {
  AlertCircle, ChevronDown, ChevronUp, ListChecks, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCatalogScope } from '@/lib/use-catalog-scope';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * F3-09 — options & suppléments d'une boutique.
 *
 *   Accompagnement (obligatoire, 1 choix)   Alloco · Frites · Riz
 *   Suppléments (0 à 2)                     Œuf +300 · Fromage +500
 *
 * Une bibliothèque de groupes par vendeur, attachés ensuite aux produits.
 * Le serveur est l'autorité : propriété (`resolveTargetRestaurant`), plafonds,
 * cardinalités, prix. Cet écran ne recalcule rien — il affiche ses refus.
 *
 * Supprimer une option déjà dans des paniers retire ces lignes ENTIÈRES des
 * paniers (jamais « Poulet » sans son alloco) : l'écran le dit avant de le
 * faire, et annonce le nombre de lignes retirées après.
 */

const inputClass =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function ruleLabel(g: { minSelect: number; maxSelect: number }): string {
  if (g.minSelect >= 1) {
    return g.minSelect === g.maxSelect
      ? `Obligatoire · ${g.minSelect} choix`
      : `Obligatoire · ${g.minSelect} à ${g.maxSelect} choix`;
  }
  return g.maxSelect === 1 ? 'Facultatif · 1 choix' : `Facultatif · jusqu'à ${g.maxSelect}`;
}

type Dialog = null | { mode: 'create' } | { mode: 'edit'; group: ModifierLibraryGroup };

function GroupDialog({
  dialog, token, targetRestaurantId, onClose,
}: {
  dialog: Exclude<Dialog, null>;
  token: string | null;
  targetRestaurantId: string | undefined;
  onClose: () => void;
}) {
  const editing = dialog.mode === 'edit' ? dialog.group : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [required, setRequired] = useState(editing ? editing.minSelect >= 1 : true);
  const [maxSelect, setMaxSelect] = useState(editing?.maxSelect ?? 1);
  const [options, setOptions] = useState<ModifierOptionInput[]>(
    editing
      ? editing.options.map((o) => ({
          id: o.id, name: o.name, priceDeltaXaf: o.priceDeltaXaf, maxQuantity: o.maxQuantity, isAvailable: o.isAvailable,
        }))
      : [{ name: '', priceDeltaXaf: 0, maxQuantity: 1 }],
  );
  const create = useCreateModifierGroup(token);
  const update = useUpdateModifierGroup(token);
  const saving = create.isPending || update.isPending;

  const removedIds = editing
    ? editing.options.filter((o) => !options.some((x) => x.id === o.id)).map((o) => o.name)
    : [];

  function patchOption(index: number, patch: Partial<ModifierOptionInput>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= options.length) return;
    setOptions((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = options.map((o) => ({ ...o, name: o.name.trim() })).filter((o) => o.name);
    if (!name.trim()) return void toast.error('Le nom du groupe est requis');
    if (cleaned.length === 0) return void toast.error('Ajoutez au moins une option');
    const minSelect = required ? 1 : 0;
    const body = {
      name: name.trim(),
      minSelect,
      maxSelect: Math.max(maxSelect, minSelect, 1),
      options: cleaned,
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, "Erreur lors de l'enregistrement"));
    if (editing) {
      update.mutate(
        { id: editing.id, restaurantId: targetRestaurantId, ...body },
        { onSuccess: () => { toast.success('Groupe mis à jour'); onClose(); }, onError },
      );
    } else {
      create.mutate(
        { restaurantId: targetRestaurantId, ...body },
        { onSuccess: () => { toast.success('Groupe créé'); onClose(); }, onError },
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {editing ? 'Modifier le groupe' : "Nouveau groupe d'options"}
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Nom (vu par le client)
          <input
            autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
            placeholder="Accompagnement, Sauce, Suppléments…" className={`${inputClass} mt-1`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Choix obligatoire
          </label>
          <label className="flex items-center gap-2">
            Choix maximum
            <input
              type="number" min={1} max={20} value={maxSelect}
              onChange={(e) => setMaxSelect(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              className={`${inputClass} w-20`}
            />
          </label>
          <span className="text-xs text-zinc-400">
            {maxSelect === 1 ? 'Le client choisit une seule option.' : `Jusqu'à ${maxSelect} options différentes.`}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Options</p>
          {options.map((o, i) => (
            <div key={o.id ?? `new-${i}`} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-zinc-400 disabled:opacity-25" aria-label="Monter"><ChevronUp size={12} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === options.length - 1} className="p-0.5 text-zinc-400 disabled:opacity-25" aria-label="Descendre"><ChevronDown size={12} /></button>
              </div>
              <input
                value={o.name} maxLength={80} onChange={(e) => patchOption(i, { name: e.target.value })}
                placeholder="Alloco" className={`${inputClass} flex-1`} aria-label={`Nom de l'option ${i + 1}`}
              />
              <input
                type="number" min={0} step={50} value={o.priceDeltaXaf}
                onChange={(e) => patchOption(i, { priceDeltaXaf: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                className={`${inputClass} w-24`} aria-label="Supplément (FCFA)" title="Supplément en FCFA (0 = inclus)"
              />
              <input
                type="number" min={1} max={10} value={o.maxQuantity ?? 1}
                onChange={(e) => patchOption(i, { maxQuantity: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                className={`${inputClass} w-16`} aria-label="Quantité maximale" title="Combien de fois le client peut la prendre"
              />
              <button
                type="button" onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Retirer l'option"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, { name: '', priceDeltaXaf: 0, maxQuantity: 1 }])}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Plus size={12} /> Ajouter une option
          </button>
          <p className="text-[11px] text-zinc-400">Colonnes : nom · supplément en FCFA (jamais négatif) · quantité max par plat.</p>
        </div>

        {removedIds.length > 0 && (
          <p className="text-xs rounded-lg bg-amber-50 text-amber-800 p-3">
            {removedIds.join(', ')} {removedIds.length > 1 ? 'seront retirées' : 'sera retirée'} de la carte.
            Les paniers qui les contiennent perdront la ligne entière — jamais le plat sans son option.
            Les commandes passées gardent leur copie.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Attache des groupes à un produit, dans l'ordre (remplacement complet). */
function ProductAttachments({
  products, groups, token, targetRestaurantId,
}: {
  products: Product[];
  groups: ModifierLibraryGroup[];
  token: string | null;
  targetRestaurantId: string | undefined;
}) {
  const [productId, setProductId] = useState('');
  const setGroups = useSetProductModifierGroups(token);
  const attached = useMemo(
    () => groups.filter((g) => g.products.some((p) => p.id === productId)).map((g) => g.id),
    [groups, productId],
  );
  const [draft, setDraft] = useState<string[] | null>(null);
  const current = draft ?? attached;

  function toggle(id: string) {
    setDraft(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function save() {
    const detaching = attached.filter((id) => !current.includes(id)).length;
    setGroups.mutate(
      { productId, groupIds: current, restaurantId: targetRestaurantId },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success(detaching > 0 ? 'Options du produit mises à jour — les paniers concernés ont été ajustés' : 'Options du produit mises à jour');
        },
        onError: (err) => toast.error(errorMessage(err, "Les options n'ont pas pu être enregistrées")),
      },
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Options d&apos;un produit</h2>
      <select
        value={productId}
        onChange={(e) => { setProductId(e.target.value); setDraft(null); }}
        className={inputClass}
        aria-label="Produit"
      >
        <option value="">Choisir un produit…</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
      </select>
      {productId && (
        <>
          <div className="space-y-1">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={current.includes(g.id)} onChange={() => toggle(g.id)} />
                <span>{g.name}</span>
                <span className="text-xs text-zinc-400">{ruleLabel(g)}</span>
                {current.includes(g.id) && (
                  <span className="ml-auto text-[11px] text-zinc-400">#{current.indexOf(g.id) + 1}</span>
                )}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400">
            L&apos;ordre d&apos;affichage suit l&apos;ordre de sélection. Toutes les variantes du produit partagent ces options.
          </p>
          <button
            onClick={save} disabled={setGroups.isPending || draft === null}
            className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {setGroups.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      )}
    </div>
  );
}

export default function OptionsPage() {
  const { token } = useAuthStore();
  const scope = useCatalogScope();
  const { data: library, isLoading } = useModifierLibrary(
    scope.needsVendor ? undefined : scope.targetRestaurantId,
    scope.needsVendor ? null : token,
  );
  const { data: products = [] } = useProducts(scope.restaurantId, scope.needsVendor ? null : token);
  const availability = useSetModifierOptionAvailability(token);
  const remove = useDeleteModifierGroup(token);
  const reorder = useReorderModifierGroups(token);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirmDelete, setConfirmDelete] = useState<ModifierLibraryGroup | null>(null);

  const groups = library?.groups ?? [];
  const meta = library?.meta;
  // Un vendeur n'écrit que si l'éditeur est ouvert (serveur). L'ADMIN peut
  // préparer une carte avant : rien n'en est visible tant que les options sont éteintes.
  const readOnly = !scope.isAdmin && meta !== undefined && !meta.modifiersManagementEnabled;

  if (scope.noRestaurant) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <p className="text-sm text-zinc-500">Aucun restaurant attribué.</p>
      </div>
    );
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= groups.length) return;
    const ids = groups.map((g) => g.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate(
      { groupIds: ids, restaurantId: scope.targetRestaurantId },
      { onError: () => toast.error("L'ordre n'a pas pu être enregistré") },
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {scope.isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 shrink-0">Vendeur :</label>
            <select
              value={scope.restaurantId ?? ''}
              onChange={(e) => scope.select(e.target.value || null)}
              className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            >
              {scope.vendors.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setDialog({ mode: 'create' })}
          disabled={scope.needsVendor || readOnly}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <Plus size={15} /> Nouveau groupe
        </button>
      </div>

      {meta && !meta.modifiersEnabled && (
        <p className="text-xs rounded-xl bg-amber-50 text-amber-800 p-3">
          Les options ne sont pas encore proposées aux clients (interrupteur plateforme éteint).
          {scope.isAdmin ? ' Vous pouvez préparer la carte : rien n’en sera visible ni exigé tant que l’interrupteur reste éteint.' : ''}
        </p>
      )}
      {readOnly && (
        <p className="text-xs rounded-xl bg-zinc-100 text-zinc-600 p-3">
          L&apos;éditeur d&apos;options ouvrira dès que les applications clientes seront à jour.
        </p>
      )}

      {scope.needsVendor ? (
        <p className="text-sm text-zinc-500 p-10 text-center">Sélectionnez un vendeur pour voir ses options.</p>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 shadow-card p-10 text-center">
          <ListChecks className="mx-auto text-zinc-300 mb-3" size={32} />
          <p className="text-sm text-zinc-500">
            Aucun groupe d&apos;options. Exemple : « Accompagnement » (obligatoire) avec Alloco, Frites, Riz.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <div key={g.id} className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || readOnly} className="p-0.5 text-zinc-400 disabled:opacity-25" aria-label="Monter"><ChevronUp size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === groups.length - 1 || readOnly} className="p-0.5 text-zinc-400 disabled:opacity-25" aria-label="Descendre"><ChevronDown size={14} /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</p>
                  <p className="text-xs text-zinc-400">
                    {ruleLabel(g)}
                    {g.products.length > 0 ? ` · ${g.products.map((p) => p.nom).join(', ')}` : ' · attaché à aucun produit'}
                  </p>
                </div>
                <button onClick={() => setDialog({ mode: 'edit', group: g })} disabled={readOnly} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-40" title="Modifier">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete(g)} disabled={readOnly} className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40" title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <li key={o.id}>
                    <button
                      disabled={readOnly || availability.isPending}
                      onClick={() =>
                        availability.mutate(
                          { optionId: o.id, isAvailable: !o.isAvailable, restaurantId: scope.targetRestaurantId },
                          {
                            onSuccess: () => toast.success(o.isAvailable ? `${o.name} en rupture` : `${o.name} remis en vente`),
                            onError: (err) => toast.error(errorMessage(err, 'Erreur')),
                          },
                        )
                      }
                      title={o.isAvailable ? 'Marquer en rupture' : 'Remettre en vente'}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        o.isAvailable
                          ? 'border-zinc-200 text-zinc-700 hover:border-red-300'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-400 line-through hover:border-green-300'
                      }`}
                    >
                      {o.name}
                      {o.priceDeltaXaf > 0 ? ` +${o.priceDeltaXaf.toLocaleString('fr-FR')}` : ''}
                      {o.maxQuantity > 1 ? ` (×${o.maxQuantity})` : ''}
                      {!o.isAvailable ? ' · épuisé' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!scope.needsVendor && groups.length > 0 && !readOnly && (
        <ProductAttachments
          products={products}
          groups={groups}
          token={token}
          targetRestaurantId={scope.targetRestaurantId}
        />
      )}

      {dialog && (
        <GroupDialog dialog={dialog} token={token} targetRestaurantId={scope.targetRestaurantId} onClose={() => setDialog(null)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Supprimer « {confirmDelete.name} » ?</h3>
            <p className="text-sm text-zinc-500 mb-5">
              Le groupe sera retiré de {confirmDelete.products.length} produit(s). Les paniers qui portent une de ses options
              perdront la ligne entière. Les commandes passées gardent leur copie.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-zinc-200">Annuler</button>
              <button
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(
                    { id: confirmDelete.id, restaurantId: scope.targetRestaurantId },
                    {
                      onSuccess: () => { toast.success('Groupe supprimé'); setConfirmDelete(null); },
                      onError: (err) => toast.error(errorMessage(err, 'Erreur lors de la suppression')),
                    },
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
              >
                {remove.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
