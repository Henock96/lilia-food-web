'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useMyOrders } from '@lilia/api-client';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor } from '@lilia/utils';
import { pageVariants, containerVariants, cardVariants } from '@lilia/motion';
import { OrderCardSkeleton } from '@/components/ui/skeleton';

export default function CommandesPage() {
  const { token } = useAuthStore();
  const { data: orders, isLoading, isError } = useMyOrders(token);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-2xl mx-auto px-4 sm:px-6 py-10 min-h-screen"
    >
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8" style={{ fontFamily: 'var(--font-display)' }}>
        Mes commandes
      </h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-zinc-500">
          <p className="font-medium">Impossible de charger vos commandes</p>
          <p className="text-sm mt-1">Vérifiez votre connexion et réessayez</p>
        </div>
      )}

      {!isLoading && !isError && orders?.length === 0 && (
        <div className="text-center py-24 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center">
            <Package className="w-10 h-10 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-800 text-lg">Aucune commande</p>
            <p className="text-zinc-500 text-sm mt-1">Passez votre première commande !</p>
          </div>
          <Link
            href="/restaurants"
            className="mt-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-2xl hover:bg-primary-600 transition-colors"
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
                className="block bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border hover:border-zinc-200 dark:hover:border-zinc-600 hover:shadow-sm dark:hover:shadow-black/20 p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{order.restaurant?.nom ?? 'Restaurant'}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getOrderStatusColor(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(order.total)}</span>
                  <span>{order.isDelivery ? 'Livraison' : 'Retrait'}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
