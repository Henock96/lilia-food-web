'use client';

import { useMemo, useState } from 'react';
import {
  useAdminVendors,
  useAdminPendingVendors,
  useApproveVendor,
  useSuspendVendor,
  useActivateVendor,
  useVendorStats,
} from '@lilia/api-client';
import type { AdminVendor, VendorType } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
  Clock,
  Package,
  ShoppingBag,
  X,
} from 'lucide-react';
import { CreateVendorPanel } from './_create-panel';

/**
 * Page Vendeurs (admin marketplace, LIL-116).
 *
 * Vue admin distincte de /restaurants : surface aussi les vendeurs non
 * approuvés et suspendus. Tabs Tous / En attente. Création vendeur +
 * propriétaire via POST /admin/restaurants avec `vendorType` au choix.
 */

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  RESTAURANT: 'Restaurant',
  HOME_COOK: 'Cuisine maison',
  BAKERY: 'Boulangerie',
  BEVERAGE_SHOP: 'Boissons',
  GROCERY: 'Épicerie',
};

const VENDOR_TYPE_BADGE: Record<VendorType, string> = {
  RESTAURANT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  HOME_COOK: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  BAKERY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BEVERAGE_SHOP: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  GROCERY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

type Tab = 'all' | 'pending';

export default function VendeursPage() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('all');
  const [typeFilter, setTypeFilter] = useState<VendorType | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminVendor | null>(null);

  const allVendorsQuery = useAdminVendors(token, {
    vendorType: typeFilter || undefined,
    limit: 50,
  });
  const pendingQuery = useAdminPendingVendors(token);
  const statsQuery = useVendorStats(token);

  const approveMutation = useApproveVendor(token);
  const suspendMutation = useSuspendVendor(token);
  const activateMutation = useActivateVendor(token);

  const vendors = useMemo<AdminVendor[]>(() => {
    if (tab === 'pending') return pendingQuery.data?.data ?? [];
    return allVendorsQuery.data?.data ?? [];
  }, [tab, pendingQuery.data, allVendorsQuery.data]);

  const isLoading =
    tab === 'pending' ? pendingQuery.isLoading : allVendorsQuery.isLoading;

  if (!isAdmin) {
    return (
      <div className="text-sm text-zinc-500">
        Section réservée aux administrateurs.
      </div>
    );
  }

  function handleApprove(vendor: AdminVendor) {
    approveMutation.mutate(vendor.id, {
      onSuccess: () => toast.success(`${vendor.nom} approuvé`),
      onError: (err: unknown) =>
        toast.error((err as Error).message ?? 'Erreur lors de l\'approbation'),
    });
  }

  function handleActivate(vendor: AdminVendor) {
    activateMutation.mutate(vendor.id, {
      onSuccess: () => toast.success(`${vendor.nom} réactivé`),
      onError: (err: unknown) =>
        toast.error((err as Error).message ?? 'Erreur lors de la réactivation'),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Vendeurs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Marketplace multi-vendeurs — restaurants, cuisines maison, boulangeries, boissons.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          Nouveau vendeur
        </button>
      </div>

      {/* Stats */}
      {statsQuery.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={statsQuery.data.total} />
          <StatCard
            label="À valider"
            value={statsQuery.data.pendingApproval}
            tone={statsQuery.data.pendingApproval > 0 ? 'warn' : undefined}
          />
          <StatCard label="Suspendus" value={statsQuery.data.suspended} />
          <StatCard
            label="Types actifs"
            value={Object.keys(statsQuery.data.byType).length}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          Tous les vendeurs
        </TabButton>
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          En attente
          {pendingQuery.data && pendingQuery.data.meta.total > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {pendingQuery.data.meta.total}
            </span>
          )}
        </TabButton>
      </div>

      {/* Filter (uniquement onglet Tous) */}
      {tab === 'all' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Filtrer par type :</span>
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === ''
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Tous
          </button>
          {(Object.keys(VENDOR_TYPE_LABELS) as VendorType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                typeFilter === t
                  ? VENDOR_TYPE_BADGE[t]
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {VENDOR_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-500">
          {tab === 'pending'
            ? 'Aucun vendeur en attente — tout est validé 👌'
            : 'Aucun vendeur ne correspond à ce filtre.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {vendors.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              onApprove={() => handleApprove(v)}
              onSuspend={() => setSuspendTarget(v)}
              onActivate={() => handleActivate(v)}
              isApproving={
                approveMutation.isPending && approveMutation.variables === v.id
              }
              isActivating={
                activateMutation.isPending && activateMutation.variables === v.id
              }
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateVendorPanel onClose={() => setCreateOpen(false)} />
      )}

      {suspendTarget && (
        <SuspendModal
          vendor={suspendTarget}
          isSubmitting={suspendMutation.isPending}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(reason) => {
            suspendMutation.mutate(
              { vendorId: suspendTarget.id, reason },
              {
                onSuccess: () => {
                  toast.success(`${suspendTarget.nom} suspendu`);
                  setSuspendTarget(null);
                },
                onError: (err: unknown) =>
                  toast.error(
                    (err as Error).message ?? 'Erreur lors de la suspension',
                  ),
              },
            );
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'warn';
}) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          tone === 'warn' && value > 0
            ? 'text-amber-500'
            : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary-500 text-primary-400'
          : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function VendorCard({
  vendor,
  onApprove,
  onSuspend,
  onActivate,
  isApproving,
  isActivating,
}: {
  vendor: AdminVendor;
  onApprove: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  isApproving: boolean;
  isActivating: boolean;
}) {
  const typeBadge = vendor.vendorType
    ? VENDOR_TYPE_BADGE[vendor.vendorType]
    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  const typeLabel = vendor.vendorType
    ? VENDOR_TYPE_LABELS[vendor.vendorType]
    : 'Restaurant';
  const isPending = vendor.adminApproved === false;
  const isSuspended = vendor.adminApproved === true && vendor.isActive === false;

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-zinc-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {vendor.nom}
            </p>
            <p className="text-xs text-zinc-500 truncate">{vendor.adresse}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadge}`}
          >
            {typeLabel}
          </span>
          {isPending && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20">
              À valider
            </span>
          )}
          {isSuspended && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-500/10 text-red-400 border-red-500/20">
              Suspendu
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5 truncate">
          <Mail size={11} />
          {vendor.owner?.email ?? '—'}
        </span>
        <span className="flex items-center gap-1.5">
          <Phone size={11} />
          {vendor.phone}
        </span>
        {vendor.acceptsPreorders && (
          <span className="flex items-center gap-1.5">
            <Clock size={11} />
            Précommandes {vendor.preorderLeadHours ?? 24}h
          </span>
        )}
        {vendor._count && (
          <>
            <span className="flex items-center gap-1.5">
              <Package size={11} />
              {vendor._count.products} produits
            </span>
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={11} />
              {vendor._count.orders} commandes
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {isPending && (
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            {isApproving ? 'Approbation…' : 'Approuver'}
          </button>
        )}
        {!isPending && vendor.isActive && (
          <button
            onClick={onSuspend}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-medium transition-colors"
          >
            <XCircle size={14} />
            Suspendre
          </button>
        )}
        {isSuspended && (
          <button
            onClick={onActivate}
            disabled={isActivating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            {isActivating ? 'Réactivation…' : 'Réactiver'}
          </button>
        )}
      </div>
    </div>
  );
}

function SuspendModal({
  vendor,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  vendor: AdminVendor;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < 5;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Suspendre {vendor.nom}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Le vendeur ne sera plus visible côté client. Réversible.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="text-xs text-zinc-500 font-medium">
            Raison (min 5 caractères)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Plaintes répétées sur la qualité"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </label>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={tooShort || isSubmitting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Suspension…' : 'Suspendre'}
          </button>
        </div>
      </div>
    </div>
  );
}
