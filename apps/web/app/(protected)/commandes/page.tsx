'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ChevronRight, RotateCcw, Wallet } from 'lucide-react';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import { ApiError, useMyOrdersPage, useReorder, type ReorderResult } from '@lilia/api-client';
import { ReorderNotice } from '@/components/orders/reorder-notice';
import { reorderFeedback } from '@/lib/reorder-feedback';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor } from '@lilia/utils';
import { pageVariants, containerVariants, cardVariants } from '@lilia/motion';
import { OrderCardSkeleton } from '@/components/ui/skeleton';

export default function CommandesPage() {
  const { token } = useAuthSession();
  const isCurrentSession = useSessionGuard();
  const [page, setPage] = useState(1);
  const [reorderResult, setReorderResult] = useState<ReorderResult | null>(null);
  const { data: history, isLoading, isError, isFetching, isPaused, error, refetch } = useMyOrdersPage(token, page);
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
      toast.error(error instanceof ApiError ? error.message : 'Le résultat du réachat n’a pas pu être confirmé. Vérifiez votre panier avant de réessayer.');
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-2xl mx-auto px-4 sm:px-6 py-10 min-h-screen"
    >
      <h1 className="text-2xl font-bold text-ink-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>
        Mes commandes
      </h1>

      {reorderResult && !inaccessible && <ReorderNotice result={reorderResult} />}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {(isError || isPaused) && (
        <div role="status" className="text-center py-6 text-ink-500">
          <p className="font-medium">{isPaused ? 'Connexion interrompue' : 'Impossible de charger vos commandes'}</p>
          <p className="text-sm mt-1">{orders ? 'Le dernier historique connu est affiché.' : 'Vérifiez votre connexion et réessayez.'}</p>
          <button onClick={() => void refetch()} disabled={isFetching} className="min-h-11 mt-2 underline">Réessayer</button>
        </div>
      )}

      {!isLoading && !isError && !isPaused && orders?.length === 0 && history?.meta.total === 0 && (
        <div className="text-center py-24 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-cream-200 rounded-3xl flex items-center justify-center">
            <Package className="w-10 h-10 text-ink-500" />
          </div>
          <div>
            <p className="font-semibold text-ink-900 text-lg">Aucune commande</p>
            <p className="text-ink-500 text-sm mt-1">Passez votre première commande !</p>
          </div>
          <Link
            href="/restaurants"
            className="mt-2 px-6 py-3 bg-tomato-600 text-white font-medium rounded-2xl hover:bg-tomato-700 transition-colors"
          >
            Explorer les restaurants
          </Link>
        </div>
      )}

      {!isLoading && !isError && !isPaused && orders?.length === 0 && (history?.meta.total ?? 0) > 0 && (
        <p role="status" className="py-6 text-ink-500">Cette page ne contient plus de commandes. Revenez à la page précédente.</p>
      )}

      {orders && orders.length > 0 && (
        <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex flex-col gap-3">
          {orders.map((order) => (
            <motion.div key={order.id} variants={cardVariants}>
              <Link
                href={`/commandes/${order.id}`}
                className="block bg-white rounded-2xl border border-cream-200 hover:border-cream-300 hover:shadow-sm p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-ink-900 text-sm">{order.restaurant?.nom ?? 'Restaurant'}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getOrderStatusColor(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink-500 group-hover:text-ink-700 transition-colors" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs text-ink-500">
                  <div className="flex items-center gap-4">
                    <span>{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-ink-900">{formatCurrency(order.total)}</span>
                    <span>{order.isDelivery ? 'Livraison' : 'Retrait'}</span>
                  </div>
                  {/* Une commande non payée est la seule qui attende quelque
                      chose du client : sans ce repère, elle se confond avec les
                      autres et il ne sait pas qu'il doit y revenir. Le paiement
                      lui-même vit sur le détail — un second point d'entrée
                      dupliquerait ses états. */}
                  {order.status === 'EN_ATTENTE' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-medium shrink-0">
                      <Wallet className="w-3 h-3" />
                      À payer
                    </span>
                  )}
                  {(order.status === 'LIVRER' || order.status === 'ANNULER') && (
                    <button
                      onClick={(e) => handleReorder(e, order.id)}
                      disabled={reorder.isPending || isError || isPaused}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-tomato-100 text-tomato-700 hover:bg-cream-200 rounded-xl text-xs font-medium transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Recommander
                    </button>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!inaccessible && (
        <nav aria-label="Pages de l’historique" className="mt-6 flex items-center justify-between gap-3 text-sm">
          <button type="button" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="min-h-11 px-4 rounded-xl border border-cream-300 disabled:opacity-50">Précédent</button>
          <p aria-live="polite">Page {page}{history ? ` sur ${history.meta.totalPages} · ${history.meta.total} commande${history.meta.total > 1 ? 's' : ''}` : ''}</p>
          <button type="button" disabled={!history || page >= history.meta.totalPages || isFetching || isError || isPaused} onClick={() => setPage(p => p + 1)}
            className="min-h-11 px-4 rounded-xl border border-cream-300 disabled:opacity-50">Suivant</button>
        </nav>
      )}
    </motion.div>
  );
}
