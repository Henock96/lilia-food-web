'use client';

import Image from 'next/image';
import type { TopProduct } from '@lilia/types';

interface TopProductsProps {
  data: TopProduct[];
}

export function TopProducts({ data }: TopProductsProps) {
  const max = Math.max(...data.map((d) => d.totalQuantity), 1);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-5 shadow-card">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Top produits</h3>
      <div className="space-y-3">
        {data.map((p, i) => (
          <div key={p.productId} className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400 w-4 shrink-0 tabular-nums">{i + 1}</span>
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.nom} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">🍽</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{p.nom}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${(p.totalQuantity / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums shrink-0">{p.totalQuantity}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums shrink-0">
              {p.totalRevenue.toLocaleString('fr-FR')} <span className="text-zinc-400 font-normal">FCFA</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
