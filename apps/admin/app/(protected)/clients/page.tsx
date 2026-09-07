'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  useClientStats, useClientDetail, useClientLoyalty, useClientReferral, useAdminClients,
  useRestaurantClients, useRestaurantClientOrders,
  usePublicPlatformSettings, pointsToXaf, useAdjustClientLoyalty,
  type RestaurantClient,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin, useMyRestaurantScoped } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserPlus, Repeat, TrendingUp, TrendingDown,
  Phone, Mail, MapPin, ChevronRight, X, ShoppingBag, Clock, Download,
  Star, Gift, Search, ChevronLeft, AlertCircle, Plus, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCsv } from '@/lib/export-csv';

interface ClientEntry {
  id: string;
  nom: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface TopClientEntry {
  rank: number;
  client: ClientEntry;
  orderCount: number;
  totalSpent: number;
}

interface ClientsData {
  thisMonth: { total: number; new: number; returning: number };
  lastMonth: { total: number };
  growth: string;
  topClients: TopClientEntry[];
}

interface DetailOrder {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: { quantite: number; prix: number; product: { nom: string } | null }[];
}

interface DetailData {
  client: ClientEntry & { adresses: { rue: string; ville: string; etat: string | null; isDefault: boolean }[] };
  stats: { orderCount: number; totalSpent: number; averageOrder: number; lastOrderAt: string | null };
  recentOrders: DetailOrder[];
}

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente', PAYER: 'Payé', EN_PREPARATION: 'En préparation',
  PRET: 'Prêt', EN_ROUTE: 'En route', LIVRER: 'Livré', ANNULER: 'Annulé',
};

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Libellé humain d'une écriture de fidélité.
 *
 * Le back-office n'affichait que `reason`, une chaîne libre : un gain de
 * commande, une récompense de parrainage et un ajustement manuel s'y
 * ressemblaient. Le `type` vient de la base et ne dépend d'aucune formulation.
 */
const LOYALTY_TYPE_LABELS: Record<string, { label: string; tone: string }> = {
  ORDER_EARN: { label: 'Commande livrée', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  ORDER_SPEND: { label: 'Points utilisés', tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
  CANCELLATION_REFUND: { label: 'Annulation', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  REFERRAL_REFERRER: { label: 'Parrainage', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  REFERRAL_REFERRED: { label: 'Bonus filleul (historique)', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
  ADJUSTMENT: { label: 'Ajustement manuel', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
};

/**
 * Ajustement manuel d'un solde.
 *
 * Il n'existait aucun moyen de corriger une erreur de crédit : la seule voie
 * était une requête SQL à la main — invisible, sans auteur, et qui mettait le
 * compte en dérive au contrôle du lendemain.
 *
 * Le motif est **obligatoire**, et le serveur le refuse en dessous de cinq
 * caractères. Un point vaut de l'argent : le créditer à la main est un
 * mouvement financier, pas un réglage, et il laisse une trace nominative dans
 * le journal d'audit.
 */
function LoyaltyAdjustForm({ clientId, token }: { clientId: string; token: string | null }) {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const adjust = useAdjustClientLoyalty(token);

  function submit(sign: 1 | -1) {
    const value = Number(points);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error('Indiquez un nombre entier de points, supérieur à zéro.');
      return;
    }
    if (reason.trim().length < 5) {
      toast.error('Le motif est obligatoire (5 caractères minimum).');
      return;
    }
    adjust.mutate(
      { clientId, points: sign * value, reason: reason.trim() },
      {
        onSuccess: (res) => {
          toast.success(`Solde ajusté : ${res.balance} point(s).`);
          setPoints('');
          setReason('');
          setOpen(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Ajustement refusé.'),
      },
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 text-xs text-primary-600 dark:text-primary-400 hover:underline"
      >
        Ajuster le solde manuellement
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
      <p className="text-[11px] text-amber-600 dark:text-amber-400">
        ⚠️ Mouvement financier tracé : votre nom, le motif et l&apos;avant/après sont
        enregistrés au journal d&apos;audit.
      </p>
      <input
        type="number"
        min={1}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        placeholder="Nombre de points"
        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 tabular-nums"
      />
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif (obligatoire) — ex. « geste commercial commande #A1B2C3 »"
        maxLength={300}
        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => submit(1)}
          disabled={adjust.isPending}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-emerald-600 text-white disabled:opacity-50"
        >
          <Plus size={12} /> Créditer
        </button>
        <button
          onClick={() => submit(-1)}
          disabled={adjust.isPending}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-red-600 text-white disabled:opacity-50"
        >
          <Minus size={12} /> Débiter
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-2.5 py-1.5 text-xs text-zinc-500 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function LoyaltySection({ clientId, token }: { clientId: string; token: string | null }) {
  const { data, isLoading, isError } = useClientLoyalty(clientId, token);
  // Le barème vient du serveur : aucune conversion points → FCFA en dur.
  const { data: pricing } = usePublicPlatformSettings();

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (isError) return <p className="text-xs text-red-500">Impossible de charger les données de fidélité.</p>;
  if (!data) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Fidélité</p>
      <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {data.balance.toLocaleString('fr-FR')}
          </span>
          <span className="text-sm text-zinc-500">points</span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          ≈ {pointsToXaf(data.balance, pricing).toLocaleString('fr-FR')} FCFA de réduction disponible
        </p>
      </div>
      <LoyaltyAdjustForm clientId={clientId} token={token} />

      {data.transactions.length === 0 ? (
        <p className="text-xs text-zinc-400">Aucune transaction de fidélité</p>
      ) : (
        <div className="space-y-1.5">
          {data.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${LOYALTY_TYPE_LABELS[t.type]?.tone ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {LOYALTY_TYPE_LABELS[t.type]?.label ?? t.type}
                  </span>
                  {/* « Quelle commande ? » et « quel filleul ? » ont désormais
                      une réponse en colonne, pas dans une chaîne libre. */}
                  {t.orderId && (
                    <span className="text-[10px] text-zinc-400 font-mono truncate">#{t.orderId.slice(-6).toUpperCase()}</span>
                  )}
                  {t.actorId && (
                    <span className="text-[10px] text-blue-500">par un admin</span>
                  )}
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 truncate">{t.reason}</p>
                <p className="text-zinc-400">
                  {formatTxnDate(t.createdAt)}
                  {t.sourceUserId && ` · filleul ${t.sourceUserId.slice(-6)}`}
                </p>
              </div>
              <span className={`font-semibold tabular-nums shrink-0 ${
                t.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {t.points >= 0 ? '+' : ''}{t.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferralSection({ clientId, token }: { clientId: string; token: string | null }) {
  const { data, isLoading, isError } = useClientReferral(clientId, token);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (isError) return <p className="text-xs text-red-500">Impossible de charger les données de parrainage.</p>;
  if (!data) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Parrainage</p>
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift size={14} className="text-primary-500 shrink-0" />
          {data.referralCode ? (
            <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {data.referralCode}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Aucun code de parrainage</span>
          )}
        </div>
        {data.referredByCode && (
          <p className="text-xs text-zinc-500">
            Parrainé via le code <span className="font-mono text-zinc-700 dark:text-zinc-300">{data.referredByCode}</span>
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.totalReferrals}</p>
            <p className="text-xs text-zinc-400">Filleuls</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.convertedReferrals}</p>
            <p className="text-xs text-zinc-400">Convertis</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{data.referralBonusEarned}</p>
            <p className="text-xs text-zinc-400">Pts gagnés</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientDetailPanel({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { token } = useAuthStore();
  const { data: raw, isLoading } = useClientDetail(clientId, token);
  const detail = raw as unknown as DetailData | undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-card border-l border-zinc-200 dark:border-dark-border h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-card z-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Détail client</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : !detail ? (
          <div className="p-5 text-center text-sm text-zinc-400">Client introuvable</div>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                {detail.client.imageUrl ? (
                  <Image src={detail.client.imageUrl} alt="" width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-zinc-400">
                    {(detail.client.nom || detail.client.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{detail.client.nom || '—'}</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                  <Mail size={11} />
                  <span>{detail.client.email || '—'}</span>
                </div>
                {detail.client.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                    <Phone size={11} />
                    <span>{detail.client.phone}</span>
                  </div>
                )}
                <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
                  Client depuis {new Date(detail.client.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{detail.stats.orderCount}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Commandes</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {detail.stats.totalSpent.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">FCFA total</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {detail.stats.averageOrder.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">FCFA moy.</p>
              </div>
            </div>

            {/* Last order */}
            {detail.stats.lastOrderAt && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock size={12} />
                Dernière commande le {new Date(detail.stats.lastOrderAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            )}

            {/* Fidélité */}
            <LoyaltySection clientId={clientId} token={token} />

            {/* Parrainage */}
            <ReferralSection clientId={clientId} token={token} />

            {/* Addresses */}
            {detail.client.adresses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Adresses</p>
                <div className="space-y-1.5">
                  {detail.client.adresses.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <MapPin size={11} className="shrink-0 mt-0.5 text-zinc-400" />
                      <span>{a.rue}, {a.ville}{a.etat ? `, ${a.etat}` : ''}</span>
                      {a.isDefault && <span className="text-primary-500 font-medium shrink-0">défaut</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent orders */}
            {detail.recentOrders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Commandes récentes</p>
                <div className="space-y-2">
                  {detail.recentOrders.map((o) => (
                    <div key={o.id} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-zinc-500">#{o.id.slice(-6).toUpperCase()}</span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {(o.total ?? 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-zinc-500">{STATUS_LABELS[o.status] ?? o.status}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 truncate">
                        {o.items.map(i => `${i.quantite}× ${i.product?.nom ?? '?'}`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AllClientsSection({
  token,
  onSelect,
}: {
  token: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  // Debounce de la recherche (350ms) + retour page 1 à chaque nouvelle recherche
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, isPlaceholderData } = useAdminClients(token, page, debounced);
  const totalPages = data ? data.meta.totalPages : 1;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">Tous les clients</h3>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, email…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-red-500">Impossible de charger la liste des clients.</p>
        </div>
      ) : !data?.data.length ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {debounced ? 'Aucun client ne correspond à cette recherche' : 'Aucun client'}
          </p>
        </div>
      ) : (
        <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.data.map((c) => {
            const name = c.nom || c.email || '—';
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="flex items-center gap-4 px-5 py-3 w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.nom || '—'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                        <Mail size={10} />{c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                        <Phone size={10} />{c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <Star size={10} className="text-amber-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {c.loyaltyPoints.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <ShoppingBag size={10} className="text-zinc-400" />
                    <span className="text-xs text-zinc-400">{c._count.orders} cmd</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {data && data.meta.total > data.meta.limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
          <span className="text-xs text-zinc-400 tabular-nums">
            {data.meta.total} client{data.meta.total > 1 ? 's' : ''} · page {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Vue ADMIN — stats plateforme + top clients + recherche globale (inchangée). */
function AdminClientsView() {
  const { token } = useAuthStore();
  const { data: raw, isLoading } = useClientStats(token);
  const data = raw as unknown as ClientsData | undefined;
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const growth = parseFloat(data?.growth ?? '0');

  return (
    <div className="max-w-4xl space-y-6">

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  growth >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                }`}>
                  {growth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {data?.growth ?? '0'}%
                </span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data?.thisMonth.total ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Clients ce mois</p>
              <p className="text-xs text-zinc-400 mt-0.5">Mois dernier : {data?.lastMonth.total ?? 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <UserPlus size={16} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data?.thisMonth.new ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Nouveaux ce mois</p>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2">
                <Repeat size={16} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data?.thisMonth.returning ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Clients récurrents</p>
            </div>
          </>
        )}
      </div>

      {/* Top clients */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meilleurs clients</h3>
          <button
            onClick={() => {
              const rows = (data?.topClients ?? []).map(e => ({
                Rang:         e.rank,
                Nom:          e.client?.nom  ?? '—',
                Email:        e.client?.email ?? '—',
                Telephone:    e.client?.phone ?? '—',
                Commandes:    e.orderCount,
                Total_FCFA:   e.totalSpent,
              }));
              exportToCsv(`clients_${new Date().toISOString().slice(0,10)}.csv`, rows);
            }}
            disabled={!data?.topClients?.length}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> CSV
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !data?.topClients?.length ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-400">Aucun client pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-dark-border">
            {data.topClients.map((entry) => {
              const c = entry.client;
              const name = c.nom || c.email || '—';
              const initial = name.charAt(0).toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className="flex items-center gap-4 px-5 py-3 w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-xs font-bold text-zinc-400 w-5 tabular-nums">{entry.rank}</span>
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">{initial}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.nom || '—'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                          <Mail size={10} />{c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                          <Phone size={10} />{c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {entry.totalSpent.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal text-zinc-400">FCFA</span>
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <ShoppingBag size={10} className="text-zinc-400" />
                      <span className="text-xs text-zinc-400">{entry.orderCount} cmd</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tous les clients */}
      <AllClientsSection token={token} onSelect={setSelectedClientId} />

      {/* Detail panel */}
      {selectedClientId && (
        <ClientDetailPanel
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}

// ─── Vue RESTAURATEUR (LIL-107) ──────────────────────────────────────────────

const RESTO_CLIENTS_PER_PAGE = 20;

/**
 * Panneau détail d'un client scopé au restaurant. Les stats (nb commandes,
 * total dépensé, moyenne, dernière commande) sont calculées côté front depuis
 * les commandes du client pour ce resto — l'endpoint scoped ne les fournit pas.
 */
function RestaurantClientDetailPanel({
  restaurantId,
  client,
  onClose,
}: {
  restaurantId: string;
  client: RestaurantClient;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const { data: orders = [], isLoading } = useRestaurantClientOrders(restaurantId, client.id, token);

  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const averageOrder = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;
  const lastOrderAt = orders[0]?.createdAt ?? null; // triées desc côté backend
  const name = client.nom || client.email || '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-card border-l border-zinc-200 dark:border-dark-border h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-card z-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Détail client</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Identité */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
              {client.imageUrl ? (
                <Image src={client.imageUrl} alt="" width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-zinc-400">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{client.nom || '—'}</p>
              {client.email && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                  <Mail size={11} /><span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                  <Phone size={11} /><span>{client.phone}</span>
                </div>
              )}
              <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
                Client depuis {new Date(client.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{orderCount}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Commandes</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {totalSpent.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">FCFA total</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {averageOrder.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">FCFA moy.</p>
                </div>
              </div>

              {lastOrderAt && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock size={12} />
                  Dernière commande le {new Date(lastOrderAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
              )}

              {/* Commandes */}
              {orders.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune commande pour votre restaurant.</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Commandes</p>
                  <div className="space-y-2">
                    {orders.map((o) => (
                      <div key={o.id} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-zinc-500">#{o.id.slice(-6).toUpperCase()}</span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {(o.total ?? 0).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">
                            {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-zinc-500">{STATUS_LABELS[o.status] ?? o.status}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 truncate">
                          {o.items.map((i) => `${i.quantite}× ${i.product?.nom ?? '?'}`).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Vue RESTAURATEUR — clients de SON restaurant (recherche + pagination front). */
function RestaurantClientsView() {
  const { token } = useAuthStore();
  const { restaurant, isLoading: loadingResto, isError: noResto } = useMyRestaurantScoped(token);
  const restaurantId = restaurant?.id;

  const { data, isLoading } = useRestaurantClients(token, restaurantId);
  const clients = data?.clients ?? [];
  const total = data?.total ?? 0;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RestaurantClient | null>(null);
  // Timestamp figé au montage : évite un appel impur à Date.now() pendant le render.
  const [now] = useState(() => Date.now());

  // Cas restaurateur sans restaurant attribué — même UX que la page Restaurants
  if (noResto) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Aucun restaurant attribué
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Votre compte restaurateur n&apos;est associé à aucun restaurant.
          Contactez un administrateur Lilia pour finaliser votre activation.
        </p>
      </div>
    );
  }

  // Nouveaux sur 30 jours (calculé sur le lot chargé)
  const newCount = clients.filter(
    (c) => now - new Date(c.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
  ).length;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? clients.filter((c) =>
        [c.nom, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)),
      )
    : clients;
  const totalPages = Math.max(1, Math.ceil(filtered.length / RESTO_CLIENTS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * RESTO_CLIENTS_PER_PAGE, page * RESTO_CLIENTS_PER_PAGE);

  const busy = loadingResto || isLoading;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Stats par resto (front) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {busy ? (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <Users size={16} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{total}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Clients de votre restaurant</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <UserPlus size={16} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{newCount}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Nouveaux (30 derniers jours)</p>
            </div>
          </>
        )}
      </div>

      {/* Liste */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">Mes clients</h3>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, téléphone, email…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {busy ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-400">
              {q ? 'Aucun client ne correspond à cette recherche' : 'Aucun client pour le moment'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-dark-border">
            {pageItems.map((c) => {
              const name = c.nom || c.email || '—';
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="flex items-center gap-4 px-5 py-3 w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.nom || '—'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                          <Mail size={10} />{c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                          <Phone size={10} />{c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {filtered.length > RESTO_CLIENTS_PER_PAGE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && restaurantId && (
        <RestaurantClientDetailPanel
          restaurantId={restaurantId}
          client={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─── Dispatcher role-aware (LIL-107) ─────────────────────────────────────────

export default function ClientsPage() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <AdminClientsView /> : <RestaurantClientsView />;
}
