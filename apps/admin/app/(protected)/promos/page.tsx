'use client';

import { useState } from 'react';
import { usePromos, useCreatePromo, useTogglePromo, usePromoStats, useDeletePromo } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { PromoCode } from '@lilia/types';
import { Plus, X, ToggleLeft, ToggleRight, BarChart2, Tag, Percent, Truck, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscountType = 'FIXED' | 'PERCENT' | 'FREE_DELIVERY';

interface PromoForm {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maxDiscount: string;
  minOrderAmount: string;
  maxUsageTotal: string;
  maxUsagePerUser: string;
  firstOrderOnly: boolean;
  expiresAt: string;
}

const EMPTY_FORM: PromoForm = {
  code: '', description: '', discountType: 'FIXED',
  discountValue: '', maxDiscount: '', minOrderAmount: '0',
  maxUsageTotal: '', maxUsagePerUser: '1',
  firstOrderOnly: false, expiresAt: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  FIXED:        'Montant fixe',
  PERCENT:      'Pourcentage',
  FREE_DELIVERY:'Livraison gratuite',
};

const DISCOUNT_ICONS: Record<DiscountType, React.ReactNode> = {
  FIXED:         <Tag size={12} />,
  PERCENT:       <Percent size={12} />,
  FREE_DELIVERY: <Truck size={12} />,
};

function discountDisplay(p: PromoCode) {
  if (p.discountType === 'FREE_DELIVERY') return 'Livraison offerte';
  if (p.discountType === 'PERCENT')       return `−${p.discountValue}%${p.maxDiscount ? ` (max ${p.maxDiscount.toLocaleString('fr-FR')} FCFA)` : ''}`;
  return `−${p.discountValue.toLocaleString('fr-FR')} FCFA`;
}

interface StatsData {
  promoCode: { code: string; maxUsageTotal: number | null; _count: { usages: number } };
  totalUsages: number;
  totalDiscount: number;
  usagesByUser?: unknown[];
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSave, isSaving }: {
  onClose: () => void;
  onSave: (form: PromoForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const set = (k: keyof PromoForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error('Le code promo est requis');
      return;
    }
    if (form.discountType !== 'FREE_DELIVERY' && !form.discountValue) {
      toast.error('La valeur de remise est requise');
      return;
    }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white dark:bg-dark-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nouveau code promo</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Code *</label>
              <input
                required value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="EX: LILIA10"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type de remise</label>
              <select
                value={form.discountType}
                onChange={e => set('discountType', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                {(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map(t => (
                  <option key={t} value={t}>{DISCOUNT_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Ex: Remise de bienvenue"
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                {form.discountType === 'PERCENT' ? 'Valeur (%)' : form.discountType === 'FREE_DELIVERY' ? 'Valeur (0)' : 'Valeur (FCFA)'} *
              </label>
              <input
                required type="number" min="0" value={form.discountValue}
                onChange={e => set('discountValue', e.target.value)}
                disabled={form.discountType === 'FREE_DELIVERY'}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
              />
            </div>
            {form.discountType === 'PERCENT' && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Remise max (FCFA)</label>
                <input
                  type="number" min="0" value={form.maxDiscount}
                  onChange={e => set('maxDiscount', e.target.value)}
                  placeholder="Illimitée"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Commande min (FCFA)</label>
              <input
                type="number" min="0" value={form.minOrderAmount}
                onChange={e => set('minOrderAmount', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Usage max (total)</label>
              <input
                type="number" min="1" value={form.maxUsageTotal}
                onChange={e => set('maxUsageTotal', e.target.value)}
                placeholder="Illimité"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Usage max / client</label>
              <input
                type="number" min="1" value={form.maxUsagePerUser}
                onChange={e => set('maxUsagePerUser', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expire le</label>
              <input
                type="date" value={form.expiresAt}
                onChange={e => set('expiresAt', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={form.firstOrderOnly}
              onChange={e => set('firstOrderOnly', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Première commande uniquement</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 dark:border-dark-border shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
            {isSaving ? 'Création…' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Stats modal ──────────────────────────────────────────────────────────────

function StatsModal({ promoId, onClose }: { promoId: string; onClose: () => void }) {
  const { token } = useAuthStore();
  const { data: raw, isLoading } = usePromoStats(promoId, token);
  const stats = raw as StatsData | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-card rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Statistiques</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"><X size={16} /></button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-zinc-400 text-center py-4">Aucune donnée disponible</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{stats.totalUsages}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Utilisations</p>
              {stats.promoCode?.maxUsageTotal && (
                <p className="text-xs text-zinc-300 dark:text-zinc-600">/ {stats.promoCode.maxUsageTotal}</p>
              )}
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {(stats.totalDiscount ?? 0).toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">FCFA offerts</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PromosPage() {
  const { token } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [statsPromoId, setStatsPromoId] = useState<string | null>(null);

  const { data: promos = [], isLoading } = usePromos(token);
  const { mutate: createPromo, isPending: creating } = useCreatePromo(token);
  const { mutate: togglePromo, isPending: toggling } = useTogglePromo(token);
  const { mutate: deletePromo, isPending: deleting } = useDeletePromo(token);

  function handleCreate(form: PromoForm) {
    const payload: Record<string, unknown> = {
      code:           form.code.trim(),
      description:    form.description.trim() || undefined,
      discountType:   form.discountType,
      discountValue:  form.discountType === 'FREE_DELIVERY' ? 0 : parseFloat(form.discountValue),
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxUsagePerUser: parseInt(form.maxUsagePerUser) || 1,
      firstOrderOnly: form.firstOrderOnly,
    };
    if (form.maxDiscount)    payload.maxDiscount    = parseFloat(form.maxDiscount);
    if (form.maxUsageTotal)  payload.maxUsageTotal  = parseInt(form.maxUsageTotal);
    if (form.expiresAt)      payload.expiresAt      = new Date(form.expiresAt).toISOString();

    createPromo(payload, {
      onSuccess: () => { toast.success('Code promo créé'); setShowCreate(false); },
      onError: (err) => toast.error((err as { message?: string }).message || 'Erreur lors de la création'),
    });
  }

  function handleToggle(id: string, current: boolean) {
    togglePromo(id, {
      onSuccess: () => toast.success(current ? 'Code désactivé' : 'Code activé'),
      onError:   () => toast.error('Erreur lors de la mise à jour'),
    });
  }

  function handleDelete(id: string, code: string) {
    if (!confirm(`Supprimer le code "${code}" ? Cette action est irréversible.`)) return;
    deletePromo(id, {
      onSuccess: () => toast.success('Code promo supprimé'),
      onError:   (err) => toast.error((err as { message?: string }).message || 'Erreur lors de la suppression'),
    });
  }

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {promos.length} code{promos.length > 1 ? 's' : ''} promo
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nouveau code
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : promos.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-zinc-400">Aucun code promo. Créez-en un pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-dark-border">
            {promos.map((p: PromoCode) => {
              const isExpired = p.expiresAt ? new Date(p.expiresAt) < new Date() : false;
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Icon + code */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    p.discountType === 'FIXED'         ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    p.discountType === 'PERCENT'       ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                                                         'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {DISCOUNT_ICONS[p.discountType]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">{p.code}</span>
                      {p.firstOrderOnly && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          1ère commande
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                          Expiré
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-zinc-500">{discountDisplay(p)}</span>
                      {p.minOrderAmount > 0 && (
                        <span className="text-xs text-zinc-400">min {p.minOrderAmount.toLocaleString('fr-FR')} FCFA</span>
                      )}
                      {p.expiresAt && (
                        <span className="text-xs text-zinc-400">
                          expire {new Date(p.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="text-center shrink-0 w-16">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {p.maxUsageTotal != null ? `? / ${p.maxUsageTotal}` : '—'}
                    </p>
                    <p className="text-xs text-zinc-400">usages</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setStatsPromoId(p.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Statistiques"
                    >
                      <BarChart2 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(p.id, p.isActive)}
                      disabled={toggling}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors disabled:opacity-40"
                      title={p.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {p.isActive
                        ? <ToggleRight size={22} className="text-emerald-500" />
                        : <ToggleLeft size={22} />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.code)}
                      disabled={deleting}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onSave={handleCreate} isSaving={creating} />
      )}
      {statsPromoId && (
        <StatsModal promoId={statsPromoId} onClose={() => setStatsPromoId(null)} />
      )}
    </div>
  );
}
