'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bike, Package, ChevronRight, RotateCcw, Store, Wallet } from 'lucide-react';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import { ApiError, useMyOrdersPage, useReorder, type ReorderResult } from '@lilia/api-client';
import { ReorderNotice } from '@/components/orders/reorder-notice';
import { reorderFeedback } from '@/lib/reorder-feedback';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
  getOrderStatusColor,
} from '@lilia/utils';
import { containerVariants, cardVariants } from '@lilia/motion';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { OrderCardSkeleton } from '@/components/ui/skeleton';

export default function CommandesPage() {
  const { token } = useAuthSession();
  const isCurrentSession = useSessionGuard();
  const [page, setPage] = useState(1);
  const [reorderResult, setReorderResult] = useState<ReorderResult | null>(null);
  const {
    data: history,
    isLoading,
    isError,
    isFetching,
    isPaused,
    error,
    refetch,
  } = useMyOrdersPage(token, page);
  const inaccessible = error instanceof ApiError && [401, 403, 404].includes(error.status);
  const orders = inaccessible ? undefined : history?.data;
  const reorder = useReorder(token);
  const router = useRouter();

  async function handleReorder(e: React.MouseEvent, orderId: string) {
    e.preventDefault();
    if (!isCurrentSession() || reorder.isPending) return;
    setReorderResult(null);
    try {
      const result = await reorder.mutateAsync(orderId);
      if (!isCurrentSession()) return;
      setReorderResult(result);
      const feedback = reorderFeedback(result);
      if (feedback.navigate) {
        toast.success(feedback.message);
        router.push('/panier');
      } else {
        toast.warning(feedback.message);
      }
    } catch (error) {
      if (!isCurrentSession()) return;
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Le résultat du réachat n’a pas pu être confirmé. Vérifiez votre panier avant de réessayer.',
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="mx-auto max-w-5xl px-4 pt-5 pb-14 sm:px-6 lg:px-8">
        <Breadcrumbs
          links={[
            { label: 'Accueil', href: '/' },
            { label: 'Mon profil', href: '/profil' },
          ]}
          current="Mes commandes"
        />
        <header className="mb-7">
          <h1 className="font-display text-ink-900 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Mes commandes
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            Suivez vos commandes en cours et retrouvez vos achats précédents.
          </p>
        </header>

        {reorderResult && !inaccessible && <ReorderNotice result={reorderResult} />}

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        )}

        {(isError || isPaused) && (
          <div
            role="status"
            className="text-ink-700 mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"
          >
            <p className="font-medium">
              {isPaused ? 'Connexion interrompue' : 'Impossible de charger vos commandes'}
            </p>
            <p className="mt-1 text-sm">
              {orders
                ? 'Le dernier historique connu est affiché.'
                : 'Vérifiez votre connexion et réessayez.'}
            </p>
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-2 min-h-11 underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          !isPaused &&
          orders?.length === 0 &&
          history?.meta.total === 0 && (
            <div className="border-ink-100 flex flex-col items-center gap-4 rounded-2xl border bg-white px-5 py-16 text-center sm:py-24">
              <div className="bg-tomato-50 grid size-16 place-items-center rounded-2xl">
                <Package className="text-tomato-700 size-8" />
              </div>
              <div>
                <p className="text-ink-900 text-lg font-semibold">Aucune commande</p>
                <p className="text-ink-500 mt-1 text-sm">Passez votre première commande !</p>
              </div>
              <Link
                href="/restaurants"
                className="bg-tomato-600 hover:bg-tomato-700 mt-2 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-semibold text-white transition-colors"
              >
                Explorer les restaurants
              </Link>
            </div>
          )}

        {!isLoading &&
          !isError &&
          !isPaused &&
          orders?.length === 0 &&
          (history?.meta.total ?? 0) > 0 && (
            <p role="status" className="text-ink-500 py-6">
              Cette page ne contient plus de commandes. Revenez à la page précédente.
            </p>
          )}

        {orders && orders.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3"
          >
            {orders.map((order) => (
              <motion.article
                key={order.id}
                variants={cardVariants}
                className="border-ink-100 relative rounded-2xl border bg-white p-4 transition-shadow hover:shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-tomato-50 text-tomato-700 grid size-11 shrink-0 place-items-center rounded-xl">
                      <Package className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-ink-900 text-lg leading-tight font-extrabold">
                        <Link
                          href={`/commandes/${order.id}`}
                          className="hover:text-tomato-700 after:absolute after:inset-0 after:rounded-2xl"
                        >
                          {order.restaurant?.nom ?? 'Restaurant'}
                          <span className="sr-only">
                            {' '}
                            — commande {order.id.slice(-6).toUpperCase()}
                          </span>
                        </Link>
                      </h2>
                      <p className="text-ink-500 mt-1 text-sm">{formatDateTime(order.createdAt)}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getOrderStatusColor(order.status)}`}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </div>

                <div className="border-ink-100 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div className="text-ink-500 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5">
                      {order.isDelivery ? (
                        <Bike className="size-4" aria-hidden />
                      ) : (
                        <Store className="size-4" aria-hidden />
                      )}
                      {order.isDelivery ? 'Livraison' : 'Retrait'}
                    </span>
                    <span>
                      {order.items.length} article{order.items.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-ink-900 font-bold">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === 'EN_ATTENTE' && (
                      <span className="text-warning flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold">
                        <Wallet className="size-4" aria-hidden />À payer
                      </span>
                    )}
                    {(order.status === 'LIVRER' || order.status === 'ANNULER') && (
                      <button
                        type="button"
                        onClick={(e) => handleReorder(e, order.id)}
                        disabled={reorder.isPending || isError || isPaused}
                        className="bg-tomato-50 text-tomato-700 hover:bg-tomato-100 relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        <RotateCcw className="size-4" aria-hidden />
                        Recommander
                      </button>
                    )}
                    <ChevronRight className="text-ink-500 size-4" aria-hidden />
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {!inaccessible && (page > 1 || (history?.meta.totalPages ?? 0) > 1) && (
          <nav
            aria-label="Pages de l’historique"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-ink-100 min-h-11 rounded-full border bg-white px-4 font-semibold disabled:opacity-50"
            >
              Précédent
            </button>
            <p aria-live="polite">
              Page {page}
              {history
                ? ` sur ${history.meta.totalPages} · ${history.meta.total} commande${history.meta.total > 1 ? 's' : ''}`
                : ''}
            </p>
            <button
              type="button"
              disabled={
                !history || page >= history.meta.totalPages || isFetching || isError || isPaused
              }
              onClick={() => setPage((p) => p + 1)}
              className="border-ink-100 min-h-11 rounded-full border bg-white px-4 font-semibold disabled:opacity-50"
            >
              Suivant
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
