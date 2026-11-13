'use client';

import Link from 'next/link';
import { useDispatchSupervision, useRedispatch } from '@lilia/api-client';
import type { DispatchSupervisionItem } from '@lilia/types';
import { Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import {
  DispatchStateBadge,
  dispatchLines,
  waitingLabel,
} from '@/components/orders/dispatch-state';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card';

/**
 * Supervision du dispatch FCFS (10/11/2026) — « premier arrivé, premier
 * servi ».
 *
 * L'administration **voit** et **relance** ; elle n'attribue jamais. Les
 * livreurs prennent eux-mêmes les commandes prêtes. Une recherche épuisée
 * (cinq diffusions sans preneur) ou un échec déclaré avant la récupération
 * se relance d'ici : tous les livreurs disponibles sont de nouveau notifiés.
 */
export default function RechercheLivreursPage() {
  const { token } = useAuthStore();
  const query = useDispatchSupervision(token);
  const redispatch = useRedispatch(token);

  async function relaunch(item: DispatchSupervisionItem) {
    if (
      !window.confirm(
        `Relancer la recherche pour ${item.orderRef} ?\n\n` +
          'Tous les livreurs disponibles seront de nouveau notifiés.',
      )
    ) {
      return;
    }
    try {
      const res = await redispatch.mutateAsync(item.orderId);
      toast.success(res.message ?? 'Recherche relancée');
    } catch (e) {
      toast.error(apiMessage(e, 'Impossible de relancer la recherche'));
    }
  }

  if (query.isLoading) {
    return (
      <div className="max-w-5xl space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} max-w-5xl p-6 text-center text-sm`}>
        <p className="text-red-500">
          {apiMessage(query.error, 'Impossible de charger les recherches de livreur.')}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 dark:border-zinc-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const data = query.data;
  const sections: { title: string; hint: string; items: DispatchSupervisionItem[] }[] = [
    {
      title: 'Aucun livreur n’a accepté',
      hint: 'Cinq diffusions sans preneur : relancer, ou appeler un livreur pour qu’il accepte depuis son application.',
      items: data.exhausted,
    },
    {
      title: 'Échec déclaré avant la récupération',
      hint: 'Le repas est encore au comptoir : relancer la recherche.',
      items: data.failedBeforePickup,
    },
    {
      title: 'Recherche en cours',
      hint: `Une diffusion toutes les ${Math.round(data.roundIntervalSeconds / 60)} min, ${data.maxRounds} au plus.`,
      items: data.open,
    },
    {
      title: 'Attribuées (24 h)',
      hint: 'Prises par un livreur ; la commande reste « Prête » jusqu’à la récupération.',
      items: data.assigned,
    },
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {data.enabled
            ? 'Attribution automatique active : le premier livreur qui accepte prend la commande.'
            : 'Attribution automatique éteinte : les commandes sont affectées à la main.'}
        </span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <RefreshCw size={12} className={query.isFetching ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {sections.map((section) => (
        <section key={section.title} className={cardCls}>
          <header className="border-b border-zinc-100 px-5 py-3 dark:border-dark-border">
            <h2 className="flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {section.title}
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {section.items.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">{section.hint}</p>
          </header>
          {section.items.length === 0 ? (
            <p className="px-5 py-4 text-xs text-zinc-400">Rien ici.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-dark-border">
              {section.items.map((item) => (
                <li
                  key={item.deliveryId}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/commandes?q=${encodeURIComponent(item.orderId)}`}
                      className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {item.orderRef} — {item.restaurant.nom}
                      {item.restaurant.quartier ? ` (${item.restaurant.quartier})` : ''}
                    </Link>
                    <div>
                      <DispatchStateBadge
                        state={item.state}
                        delivererName={item.deliverer?.nom ?? null}
                      />
                    </div>
                    {dispatchLines(item, data.maxRounds).map((line) => (
                      <p key={line} className="text-[11px] text-zinc-500">
                        {line}
                      </p>
                    ))}
                    {item.state === 'ASSIGNED' && item.waitingSeconds != null && (
                      <p className="text-[11px] text-zinc-500">
                        Attribuée après {waitingLabel(item.waitingSeconds)} de recherche
                      </p>
                    )}
                    {item.deliverer?.phone && (
                      <a
                        href={`tel:${item.deliverer.phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <Phone size={11} /> {item.deliverer.phone}
                      </a>
                    )}
                  </div>
                  {item.redispatchAllowed && (
                    <button
                      onClick={() => void relaunch(item)}
                      disabled={redispatch.isPending}
                      className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-40"
                    >
                      Relancer la recherche
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
