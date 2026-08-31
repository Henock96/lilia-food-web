'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ChevronRight, RotateCcw, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useMyOrders, useReorder } from '@lilia/api-client';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor } from '@lilia/utils';
import { pageVariants, containerVariants, cardVariants } from '@lilia/motion';
import { OrderCardSkeleton } from '@/components/ui/skeleton';

export default function CommandesPage() {
  const { token } = useAuthStore();
  const { data: orders, isLoading, isError } = useMyOrders(token);
  const reorder = useReorder(token);
  const router = useRouter();

  async function handleReorder(e: React.MouseEvent, orderId: string) {
    e.preventDefault();
    try {
      await reorder.mutateAsync(orderId);
      toast.success('Articles ajoutés au panier !');
      router.push('/panier');
    } catch {
      toast.error('Impossible de recommander cette commande');
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

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-ink-500">
          <p className="font-medium">Impossible de charger vos commandes</p>
          <p className="text-sm mt-1">Vérifiez votre connexion et réessayez</p>
        </div>
      )}

      {!isLoading && !isError && orders?.length === 0 && (
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
                      disabled={reorder.isPending}
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
    </motion.div>
  );
}
