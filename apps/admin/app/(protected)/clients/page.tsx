'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useClientStats, useClientDetail } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserPlus, Repeat, TrendingUp, TrendingDown,
  Phone, Mail, MapPin, ChevronRight, X, ShoppingBag, Clock, Download,
} from 'lucide-react';
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

export default function ClientsPage() {
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
