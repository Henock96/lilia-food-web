'use client';

import { use, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  Home,
  XCircle,
  ChefHat,
  RotateCcw,
  Download,
  ThumbsUp,
} from 'lucide-react';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import {
  ApiError,
  useOrder,
  useCancelOrder,
  useReorder,
  useDownloadReceipt,
  type ReorderResult,
} from '@lilia/api-client';
import { ReorderNotice } from '@/components/orders/reorder-notice';
import { reorderFeedback } from '@/lib/reorder-feedback';
import type { OrderStatus } from '@lilia/types';
import {
  formatLineOptions,
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
  getOrderStatusColor,
  cn,
} from '@lilia/utils';
import { statusTimelineVariants } from '@lilia/motion';
import { PaymentPanel } from '@/components/checkout/payment-panel';
import { HandoverCodePanel, ReportIssuePanel } from '@/components/orders/handover-and-report';
import { ClaimPanel } from '@/components/orders/claim-panel';
import { OrderReviewPanel } from '@/components/orders/order-review-panel';
import { OrderSyncNotice } from '@/components/orders/order-sync-notice';
import { PickupPanel } from '@/components/orders/pickup-panel';
import { PushToggle } from '@/components/push/push-toggle';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { pickupStatusLabel, timelineSteps } from '@/lib/pickup-view';
import { toast } from 'sonner';
import {
  canClientCancel,
  cancellationNotice,
  readyAtLabel,
  timelinePosition,
} from '@/lib/order-status-view';

const STEP_ICONS: Partial<Record<OrderStatus, React.ElementType>> = {
  DEMANDE_ENVOYEE: Clock,
  EN_ATTENTE: Clock,
  PAYER: CheckCircle,
  ACCEPTEE: ThumbsUp,
  EN_PREPARATION: ChefHat,
  PRET: Package,
  EN_ROUTE: Truck,
  LIVRER: Home,
};

function CommandeDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuthSession();
  const isCurrentSession = useSessionGuard();
  const {
    data: order,
    isLoading,
    isError,
    error,
    isPaused,
    isFetching,
    refetch,
  } = useOrder(id, token);
  const cancelOrder = useCancelOrder(token);
  const reorder = useReorder(token);
  const downloadReceipt = useDownloadReceipt(token);
  const router = useRouter();
  const [reorderResult, setReorderResult] = useState<ReorderResult | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleCancel() {
    if (!isCurrentSession()) return;
    try {
      await cancelOrder.mutateAsync(id);
      if (!isCurrentSession()) return;
      setConfirmingCancel(false);
      toast.success('Commande annulée');
    } catch (error) {
      if (!isCurrentSession()) return;
      setConfirmingCancel(false);
      // Le serveur dit pourquoi : une commande payée entre-temps n'est plus
      // annulable par le client, et ce message est le seul à le lui apprendre.
      toast.error(error instanceof ApiError ? error.message : "Impossible d'annuler la commande");
    }
  }

  async function handleReorder() {
    if (!isCurrentSession() || reorder.isPending) return;
    setReorderResult(null);
    try {
      const result = await reorder.mutateAsync(id);
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

  async function handleDownloadReceipt() {
    if (!isCurrentSession()) return;
    try {
      await downloadReceipt.mutateAsync(id);
      if (!isCurrentSession()) return;
    } catch (e) {
      if (!isCurrentSession()) return;
      toast.error(e instanceof Error ? e.message : 'Impossible de générer le reçu');
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!order || (error instanceof ApiError && [401, 403, 404].includes(error.status))) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:px-8">
        <OrderSyncNotice
          hasOrder={false}
          error={error}
          paused={isPaused}
          fetching={isFetching}
          onRetry={() => void refetch()}
        />
        <Link href="/commandes" className="text-tomato-700 mt-2 inline-block text-sm">
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'ANNULER';
  // Le serveur publie les gestes permis (F3-01, règle R1).
  const canCancel = !isError && !isPaused && canClientCancel(order);
  // Reçu disponible une fois la commande payée (PAYER et au-delà, hors annulée).
  const isPaid =
    timelinePosition(order.status) >= timelinePosition('PAYER') ||
    order.status === 'ECHEC_LIVRAISON';
  const cancelled = isCancelled ? cancellationNotice(order) : null;
  const readyAt = readyAtLabel(order.estimatedReadyAt);
  // F3-07 — un retrait ne passe pas « en route », et ne se dit pas « livré ».
  const statusSteps = timelineSteps(order.isDelivery, order.orderFlow).map((step) => ({
    ...step,
    icon: STEP_ICONS[step.status] ?? Package,
  }));

  const currentStepIndex = statusSteps.findIndex((step) => step.status === order.status);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-14 sm:px-6 lg:px-8">
        <Breadcrumbs
          links={[
            { label: 'Accueil', href: '/' },
            { label: 'Mes commandes', href: '/commandes' },
          ]}
          current={`#${order.id.slice(-6).toUpperCase()}`}
        />
        <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-ink-900 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Commande #{order.id.slice(-6).toUpperCase()}
            </h1>
            <p className="text-ink-500 mt-2 text-sm">
              {formatDateTime(order.createdAt)} · {order.isDelivery ? 'Livraison' : 'Retrait'}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${getOrderStatusColor(order.status)}`}
          >
            {pickupStatusLabel(order) ??
              (order.orderFlow === 'ACCEPT_FIRST' &&
              order.status === 'EN_ATTENTE' &&
              order.acceptedAt
                ? 'Acceptée — à payer'
                : formatOrderStatus(order.status))}
          </span>
        </header>

        {(isError || isPaused) && (
          <OrderSyncNotice
            hasOrder
            error={error}
            paused={isPaused}
            fetching={isFetching}
            onRetry={() => void refetch()}
          />
        )}
        {reorderResult && <ReorderNotice result={reorderResult} />}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)] lg:gap-8">
          <div className="min-w-0">
            {/* F3-07 : retrait au comptoir — code, puis « J'ai récupéré ma commande » */}
            <PickupPanel order={order} token={token} />

            {/* F-06 : code de remise, pendant que le repas roule vers le client */}
            {order.status === 'EN_ROUTE' && <HandoverCodePanel orderId={order.id} token={token} />}

            {/* Notifications push : proposées ici, au moment où elles servent. */}
            {order.status !== 'LIVRER' && order.status !== 'ANNULER' && (
              <div className="mb-4 empty:hidden">
                <PushToggle variant="inline" />
              </div>
            )}

            {order.status === 'DEMANDE_ENVOYEE' && (
              <div
                role="status"
                className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
              >
                Votre demande a été envoyée au restaurant. Vous pourrez payer après son acceptation.
              </div>
            )}
            {order.orderFlow === 'ACCEPT_FIRST' &&
              order.status === 'EN_ATTENTE' &&
              order.acceptedAt && (
                <div
                  role="status"
                  className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  Le restaurant a accepté votre commande. Le paiement doit être confirmé avant sa
                  préparation.
                </div>
              )}

            {/* Paiement — placé au-dessus du détail : sur une commande EN_ATTENTE,
          c'est la seule action qui compte et elle doit être visible sans
          défiler. Le panneau se retire de lui-même quand il n'a rien à dire. */}
            <PaymentPanel
              orderId={order.id}
              orderStatus={order.status}
              paymentAllowed={!isError && !isPaused && order.paymentAllowed}
              orderTotal={order.total}
              orderMethod={order.paymentMethod}
              contactPhone={order.contactPhone}
              token={token}
            />

            {/* Timeline des statuts */}
            {currentStepIndex >= 0 && (
              <div className="border-ink-100 mb-4 rounded-2xl border bg-white p-5">
                <h2 className="font-display text-ink-900 mb-5 text-xl font-extrabold">
                  Suivi de commande
                </h2>
                <div className="flex flex-col gap-0">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = step.status === order.status;
                    const isLast = index === statusSteps.length - 1;
                    return (
                      <div key={step.status} className="flex gap-3">
                        {/* Indicateur */}
                        <div className="flex flex-col items-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: isCurrent ? 1.1 : 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                              isCompleted
                                ? isCurrent
                                  ? 'bg-tomato-600 shadow-tomato-100 text-white shadow-lg'
                                  : 'bg-emerald-500 text-white'
                                : 'bg-cream-200 text-ink-500',
                            )}
                          >
                            <step.icon className="h-4 w-4" />
                          </motion.div>
                          {!isLast && (
                            <motion.div
                              variants={statusTimelineVariants}
                              initial="initial"
                              animate={isCompleted && !isCurrent ? 'animate' : 'initial'}
                              className={cn(
                                'my-1 h-6 w-0.5 origin-top rounded-full',
                                isCompleted && !isCurrent ? 'bg-emerald-400' : 'bg-cream-300',
                              )}
                            />
                          )}
                        </div>
                        {/* Label */}
                        <div className="pt-1.5 pb-6">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              isCompleted ? 'text-ink-900' : 'text-ink-500',
                            )}
                          >
                            {step.label}
                          </p>
                          {(step.status === 'ACCEPTEE' ||
                            (order.orderFlow === 'ACCEPT_FIRST' && step.status === 'EN_ATTENTE')) &&
                            isCompleted &&
                            readyAt && <p className="text-ink-700 mt-0.5 text-xs">{readyAt}</p>}
                          {isCurrent && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-tomato-700 mt-0.5 text-xs font-medium"
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

            {order.status === 'ECHEC_LIVRAISON' && (
              <div
                role="status"
                className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                La livraison n’a pas pu être effectuée. Consultez le détail de votre commande ou
                contactez le support.
              </div>
            )}

            {cancelled && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-sm font-medium text-rose-800">{cancelled.title}</p>
                  <p className="mt-0.5 text-xs text-rose-600">{cancelled.detail}</p>
                </div>
              </div>
            )}

            {/* F3-06 : commande livrée → réclamation détaillée (articles, photo, fil
          avec le service client), 24 h après la livraison. Avant livraison, le
          signalement F-06 reste le recours (non reçue, retard). */}
            {/* Lot B : invite à noter, pilotée par le verdict serveur. */}
            <OrderReviewPanel
              orderId={order.id}
              restaurantId={order.restaurantId}
              restaurantName={order.restaurant?.nom}
              deliveryId={order.delivery?.id ?? null}
              verdict={order.review}
              token={token}
            />

            {order.status === 'LIVRER' ? (
              <ClaimPanel orderId={order.id} items={order.items} token={token} />
            ) : (
              isPaid && !isCancelled && <ReportIssuePanel orderId={order.id} token={token} />
            )}
          </div>
          <aside aria-label="Récapitulatif de la commande" className="min-w-0">
            {/* Articles */}
            <div className="border-ink-100 mb-4 rounded-2xl border bg-white p-5">
              <h2 className="font-display text-ink-900 text-xl font-extrabold">Récapitulatif</h2>
              {order.restaurant?.nom && (
                <p className="text-ink-500 mt-1 text-sm">{order.restaurant.nom}</p>
              )}
              <div className="divide-ink-100 mt-3 divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-ink-900 text-sm font-semibold wrap-anywhere">
                        {item.product?.nom}
                      </p>
                      {item.variantLabel && (
                        <p className="text-ink-500 text-xs">{item.variantLabel}</p>
                      )}
                      {/* F3-09 — options figées à la commande ; `prix` les inclut déjà. */}
                      {item.options && item.options.length > 0 && (
                        <p className="text-ink-500 text-xs">
                          {formatLineOptions(item.options, formatCurrency)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm">
                      <span className="text-ink-500">×{item.quantite}</span>
                      <span className="text-ink-900 font-semibold">
                        {formatCurrency(item.prix * item.quantite)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-ink-100 mt-4 flex flex-col gap-1.5 border-t pt-4 text-sm">
                <div className="text-ink-500 flex justify-between">
                  <span>Sous-total</span>
                  <span>{formatCurrency(order.subTotal)}</span>
                </div>
                {order.isDelivery && (
                  <div className="text-ink-500 flex justify-between">
                    <span>Livraison</span>
                    {order.deliveryFee === 0 && order.promoCodeId ? (
                      <span className="text-success font-medium">Gratuit</span>
                    ) : (
                      <span>{formatCurrency(order.deliveryFee)}</span>
                    )}
                  </div>
                )}
                <div className="text-ink-500 flex justify-between">
                  <span>Frais de service</span>
                  <span>{formatCurrency(order.serviceFee)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="text-success flex justify-between">
                    <span>Réduction code promo</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="border-ink-100 font-display text-ink-900 flex justify-between gap-2 border-t pt-2 text-lg font-extrabold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Livraison info */}
            {order.deliveryAddress && (
              <div className="border-ink-100 mb-4 rounded-2xl border bg-white p-4 text-sm">
                <h2 className="font-display text-ink-900 mb-1 text-lg font-extrabold">
                  Adresse de livraison
                </h2>
                <p className="text-ink-500">{order.deliveryAddress}</p>
              </div>
            )}

            {/* Reçu PDF — commande payée */}
            {isPaid && (
              <button
                onClick={handleDownloadReceipt}
                disabled={downloadReceipt.isPending}
                className="border-cream-300 text-ink-700 hover:bg-cream-100 mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                {downloadReceipt.isPending ? 'Génération...' : 'Télécharger le reçu'}
              </button>
            )}

            {/* Reorder */}
            {(order.status === 'LIVRER' || order.status === 'ANNULER') && (
              <button
                onClick={handleReorder}
                disabled={reorder.isPending || isError || isPaused}
                className="bg-tomato-600 hover:bg-tomato-700 mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                {reorder.isPending ? 'Ajout au panier...' : 'Recommander'}
              </button>
            )}

            {/* Cancel */}
            {canCancel && (
              <button
                onClick={() => setConfirmingCancel(true)}
                disabled={cancelOrder.isPending}
                className="w-full rounded-2xl border border-rose-200 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                {cancelOrder.isPending ? 'Annulation...' : 'Annuler la commande'}
              </button>
            )}
          </aside>
        </div>
        <ConfirmDialog
          open={confirmingCancel}
          title="Annuler cette commande ?"
          confirmLabel="Annuler la commande"
          cancelLabel="Garder ma commande"
          pending={cancelOrder.isPending}
          onConfirm={() => void handleCancel()}
          onCancel={() => setConfirmingCancel(false)}
        />
      </div>
    </div>
  );
}

export default function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
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
