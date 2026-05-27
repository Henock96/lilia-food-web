'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAdminDeliverers } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ChevronLeft, ChevronRight, ChevronRight as ArrowIcon, Mail, Phone, Package } from 'lucide-react';

export default function LivreursPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminDeliverers(token, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les livreurs.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <Bike size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun livreur</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((d) => {
              const name = d.nom || d.email || '—';
              const lastDelivery = d.deliveries[0] ?? null;
              return (
                <Link
                  key={d.id}
                  href={`/livreurs/${d.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {d.imageUrl ? (
                      <Image src={d.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{d.nom || '—'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.email && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                          <Mail size={10} />{d.email}
                        </span>
                      )}
                      {d.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                          <Phone size={10} />{d.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <Package size={11} className="text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {d._count.deliveries}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lastDelivery
                        ? `Dernière : ${new Date(lastDelivery.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                        : 'Aucune livraison'}
                    </p>
                  </div>
                  <ArrowIcon size={14} className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {data.total} livreur{data.total > 1 ? 's' : ''} &middot; page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Page précédente"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                aria-label="Page suivante"
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
    </div>
  );
}
