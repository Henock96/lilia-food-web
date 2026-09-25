'use client';

import { Minus, Plus } from 'lucide-react';
import type { ModifierGroup, ModifierOption } from '@lilia/types';
import {
  cn,
  formatCurrency,
  setModifierQuantity,
  toggleModifier,
  type ModifierSelection,
} from '@lilia/utils';
import { toast } from 'sonner';

/**
 * F3-09 — sélecteur d'options de la fiche produit.
 *
 * Radio quand `maxSelect === 1`, cases à cocher sinon ; pas-à-pas quand une
 * option se prend plusieurs fois ; option en rupture visible mais grisée.
 *
 * Composant **contrôlé** : la sélection vit dans la fiche, qui en dérive son
 * prix et son bouton. Aucune règle de prix ici — le serveur chiffre et
 * revalide tout (`POST /cart/add`, checkout).
 */
export function ModifierGroupPicker({
  groups,
  selection,
  onChange,
}: {
  groups: ModifierGroup[];
  selection: ModifierSelection;
  onChange: (next: ModifierSelection) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <GroupFieldset
          key={group.id}
          group={group}
          selection={selection}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function ruleLabel(group: ModifierGroup): string {
  if (group.minSelect >= 1) {
    if (group.minSelect === group.maxSelect) {
      return group.minSelect === 1 ? 'Obligatoire' : `Obligatoire · ${group.minSelect} choix`;
    }
    return `Obligatoire · ${group.minSelect} à ${group.maxSelect} choix`;
  }
  return group.maxSelect === 1 ? 'Facultatif' : `Facultatif · ${group.maxSelect} au maximum`;
}

function GroupFieldset({
  group,
  selection,
  onChange,
}: {
  group: ModifierGroup;
  selection: ModifierSelection;
  onChange: (next: ModifierSelection) => void;
}) {
  const single = group.maxSelect === 1;
  const picked = group.options.filter((o) => selection[o.id] !== undefined).length;
  const incomplete = picked < group.minSelect;

  function pick(option: ModifierOption) {
    const next = toggleModifier(selection, group, option);
    if (next === null) {
      if (option.isAvailable) {
        toast.error(`« ${group.name} » : ${group.maxSelect} choix au maximum.`);
      }
      return;
    }
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-ink-900">
        <span>{group.name}</span>
        <span
          className={cn(
            'text-xs font-medium',
            incomplete ? 'text-tomato-700' : 'text-ink-500',
          )}
        >
          {ruleLabel(group)}
        </span>
      </legend>
      <div role={single ? 'radiogroup' : 'group'} aria-label={group.name} className="flex flex-col gap-2">
        {group.options.map((option) => {
          const selected = selection[option.id] !== undefined;
          const quantity = selection[option.id] ?? 0;
          return (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                selected ? 'border-tomato-600 bg-tomato-100' : 'border-cream-300 bg-white',
                !option.isAvailable && 'opacity-50',
              )}
            >
              <button
                type="button"
                role={single ? 'radio' : 'checkbox'}
                aria-checked={selected}
                disabled={!option.isAvailable}
                onClick={() => pick(option)}
                className="flex flex-1 items-center gap-3 text-left text-sm disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center border-2',
                    single ? 'rounded-full' : 'rounded-md',
                    selected ? 'border-tomato-600 bg-tomato-600' : 'border-ink-300',
                  )}
                >
                  {selected && <span className={cn('bg-white', single ? 'h-2 w-2 rounded-full' : 'h-2 w-2 rounded-sm')} />}
                </span>
                <span className={cn('flex-1', selected && 'font-semibold', !option.isAvailable && 'line-through')}>
                  {option.name}
                </span>
                {!option.isAvailable && <span className="text-xs text-ink-500">Épuisé</span>}
              </button>

              {option.isAvailable && selected && option.maxQuantity > 1 && (
                <div className="flex items-center gap-2" aria-label={`Quantité de ${option.name}`}>
                  <button
                    type="button"
                    aria-label={`Moins de ${option.name}`}
                    disabled={quantity <= 1}
                    onClick={() => onChange(setModifierQuantity(selection, option, quantity - 1))}
                    className="rounded-full p-1 text-ink-700 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-4 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    aria-label={`Plus de ${option.name}`}
                    disabled={quantity >= option.maxQuantity}
                    onClick={() => onChange(setModifierQuantity(selection, option, quantity + 1))}
                    className="rounded-full p-1 text-ink-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {option.isAvailable && option.priceDeltaXaf > 0 && (
                <span className={cn('text-sm font-semibold', selected ? 'text-tomato-700' : 'text-ink-700')}>
                  +{formatCurrency(option.priceDeltaXaf)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
