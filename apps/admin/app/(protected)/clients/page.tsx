'use client';

import Image from 'next/image';
import { useClientStats } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, Repeat } from 'lucide-react';

export default function ClientsPage() {
  const { token } = useAuthStore();
  const { data, isLoading } = useClientStats(token);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.totalClients}</p>
                <p className="text-xs text-zinc-500">Total clients</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserPlus size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.newClientsThisMonth}</p>
                <p className="text-xs text-zinc-500">Nouveaux ce mois</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Repeat size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.returningClients}</p>
                <p className="text-xs text-zinc-500">Clients récurrents</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top clients */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meilleurs clients</h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : data?.topClients?.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-dark-border">
            {data.topClients.map((c, i) => (
              <div key={c.userId} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs font-bold text-zinc-400 w-5 tabular-nums">{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-sm font-semibold text-zinc-500">
                    {c.nom?.charAt(0)?.toUpperCase() ?? c.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {c.nom ?? c.email}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{c.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {c.totalSpent.toLocaleString('fr-FR')} <span className="text-xs font-normal text-zinc-400">FCFA</span>
                  </p>
                  <p className="text-xs text-zinc-400">{c.totalOrders} commandes</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-400">Aucun client pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
