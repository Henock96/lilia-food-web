'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, CheckCircle, Clock, Truck, Home, XCircle, ChefHat } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useOrder, useCancelOrder } from '@lilia/api-client';
import type { OrderStatus } from '@lilia/types';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor, cn } from '@lilia/utils';
import { pageVariants, statusTimelineVariants } from '@lilia/motion';
import { toast } from 'sonner';

const STATUS_STEPS: { status: OrderStatus; icon: React.ElementType; label: string }[] = [
  { status: 'EN_ATTENTE', icon: Clock, label: 'En attente' },
  { status: 'PAYER', icon: CheckCircle, label: 'Paiement confirmé' },
  { status: 'EN_PREPARATION', icon: ChefHat, label: 'En préparation' },
  { status: 'PRET', icon: Package, label: 'Prêt' },
  { status: 'EN_ROUTE', icon: Truck, label: 'En route' },
  { status: 'LIVRER', icon: Home, label: 'Livré' },
];

const STATUS_ORDER: OrderStatus[] = ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'PRET', 'EN_ROUTE', 'LIVRER'];

function CommandeDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const { data: order, isLoading } = useOrder(id, token);
  const cancelOrder = useCancelOrder(token);

  async function handleCancel() {
    if (!confirm('Annuler cette commande ?')) return;
    try {
      await cancelOrder.mutateAsync(id);
      toast.success('Commande annulée');
    } catch {
      toast.error('Impossible d\'annuler la commande');
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col gap-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-zinc-500">Commande introuvable</p>
        <Link href="/commandes" className="text-primary-600 text-sm mt-2 inline-block">
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'ANNULER';
  const canCancel = order.status === 'EN_ATTENTE';

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-lg mx-auto px-4 sm:px-6 py-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/commandes" className="p-2 hover:bg-zinc-100 dark:hover:bg-dark-surface rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </Link>
        <div>
          <h1 className="font-bold text-zinc-900 dark:text-zinc-100">Commande #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`ml-auto px-3 py-1.5 text-xs font-semibold rounded-full border ${getOrderStatusColor(order.status)}`}>
          {formatOrderStatus(order.status)}
        </span>
      </div>

      {/* Timeline des statuts */}
      {!isCancelled && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5 mb-4">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-5">Suivi de commande</h3>
          <div className="flex flex-col gap-0">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = STATUS_ORDER.indexOf(step.status) <= currentStepIndex;
              const isCurrent = step.status === order.status;
              const isLast = index === STATUS_STEPS.length - 1;
              return (
                <div key={step.status} className="flex gap-3">
                  {/* Indicateur */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: isCurrent ? 1.1 : 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all',
                        isCompleted
                          ? isCurrent
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                            : 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 dark:bg-dark-surface text-zinc-400',
                      )}
                    >
                      <step.icon className="w-4 h-4" />
                    </motion.div>
                    {!isLast && (
                      <motion.div
                        variants={statusTimelineVariants}
                        initial="initial"
                        animate={isCompleted && !isCurrent ? 'animate' : 'initial'}
                        className={cn(
                          'w-0.5 h-6 rounded-full my-1 origin-top',
                          isCompleted && !isCurrent ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-dark-border',
                        )}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-6 pt-1.5">
                    <p className={cn('text-sm font-medium', isCompleted ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600')}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-primary-600 mt-0.5 font-medium"
                      >
                        Statut actuel
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-medium text-rose-800 text-sm">Commande annulée</p>
            <p className="text-xs text-rose-600 mt-0.5">Cette commande a été annulée</p>
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5 mb-4">
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-4">{order.restaurant?.nom}</h3>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium truncate">{item.product?.nom}</p>
                {item.variantLabel && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.variantLabel}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <span className="text-zinc-400 dark:text-zinc-500">×{item.quantite}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(item.prix * item.quantite)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-100 dark:border-dark-border mt-4 pt-4 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
            <span>Sous-total</span>
            <span>{formatCurrency(order.subTotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
            <span>Livraison</span>
            <span>{formatCurrency(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
            <span>Frais de service</span>
            <span>{formatCurrency(order.serviceFee)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Réduction</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-base pt-1 border-t border-zinc-100 dark:border-dark-border">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Livraison info */}
      {order.deliveryAddress && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4 mb-4 text-sm">
          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Adresse de livraison</p>
          <p className="text-zinc-500 dark:text-zinc-400">{order.deliveryAddress}</p>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelOrder.isPending}
          className="w-full py-3 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium text-sm rounded-2xl transition-colors"
        >
          {cancelOrder.isPending ? 'Annulation...' : 'Annuler la commande'}
        </button>
      )}
    </motion.div>
  );
}

export default function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-10 flex flex-col gap-4">
          <div className="skeleton h-6 w-32" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      }
    >
      <CommandeDetailInner params={params} />
    </Suspense>
  );
}
