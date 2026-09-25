'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ORDERS_PAGE_SIZE,
  useAdminOrders,
  useUpdateOrderStatus,
  useAcceptOrder,
  useRejectOrder,
  useHandOverPickup,
  useDownloadReceipt,
  type OrderStatusFilter,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  AdminOrder,
  OrderStatus,
  OrderStatusCounts,
  VendorRejectionReason,
} from '@lilia/types';
import Link from 'next/link';
import {
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCsv } from '@/lib/export-csv';
import { apiMessage } from '@/lib/api-message';
import { OrderActions } from '@/components/orders/order-actions';
import { OrderFinancialsCard } from '@/components/payments/order-financials-card';
import { FailureArbitrationPanel } from '@/components/orders/failure-arbitration-panel';
import { RefundComposer } from '@/components/refunds/refund-composer';
import { AssignDriver } from '@/components/orders/assign-driver';
import { deliveryProofSummary } from '@/lib/delivery-proof';

const STATUS_LABELS: Record<OrderStatus, string> = {
  EN_ATTENTE:     'En attente',
  PAYER:          'Payé',
  ACCEPTEE:       'Accepté',
  EN_PREPARATION: 'En préparation',
  PRET:           'Prêt',
  EN_ROUTE:       'En route',
  LIVRER:         'Livré',
  ANNULER:        'Annulé',
  ECHEC_LIVRAISON: 'Livraison non aboutie',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  EN_ATTENTE:     'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  PAYER:          'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  ACCEPTEE:       'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-400',
  EN_PREPARATION: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  PRET:           'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  EN_ROUTE:       'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  LIVRER:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  ANNULER:        'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  ECHEC_LIVRAISON: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
};

/** Ordre des onglets — celui du cycle de vie, pas celui de l'enum. */
const STATUS_TABS: OrderStatus[] = [
  'EN_ATTENTE',
  'PAYER',
  'ACCEPTEE',
  'EN_PREPARATION',
  'PRET',
  'EN_ROUTE',
  'LIVRER',
  'ANNULER',
];

// La table de transitions vit désormais dans `lib/order-transitions.ts`, testée
// ligne à ligne contre `ORDER_TRANSITION_MATRIX`. Elle était ici, recopiée à la
// main et gardée par un seul contrôle sur `EN_ATTENTE` : le vendeur voyait donc
// « En route » puis « Livrée » sur des commandes où le serveur lui répond 403,
// et l'admin un bouton « En route » inatteignable par construction.

// LIL-123 : Brazzaville n'a pas de DST, mais on passe toujours par Intl pour rester
// portable si on déménage l'admin sur un fuseau différent. `en-CA` produit le
// format YYYY-MM-DD qui est trivialement comparable en string.
const BRAZZA_TZ = 'Africa/Brazzaville';

function brazzavilleDateString(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-CA', { timeZone: BRAZZA_TZ });
}

function formatScheduledShort(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { timeZone: BRAZZA_TZ, day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('fr-FR', { timeZone: BRAZZA_TZ, hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

function formatScheduledFull(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', {
    timeZone: BRAZZA_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('fr-FR', { timeZone: BRAZZA_TZ, hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

const PAID_STATUSES = new Set<OrderStatus>([
  'PAYER',
  'ACCEPTEE',
  'EN_PREPARATION',
  'PRET',
  'EN_ROUTE',
  'LIVRER',
  'ECHEC_LIVRAISON',
]);

function OrderCard({
  order,
  role,
  token,
  onStatusUpdate,
  onAccept,
  onReject,
  onHandOverWithCode,
  pending,
}: {
  order: AdminOrder;
  role: string | undefined;
  token: string | null;
  onStatusUpdate: (id: string, status: OrderStatus) => void;
  onAccept: (id: string, prepMinutes: number) => void;
  onReject: (id: string, reason: VendorRejectionReason, note?: string) => void;
  onHandOverWithCode: (id: string, code: string) => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  // Personne ne déclare une commande payée (F-07) : un virement manuel se
  // confirme depuis l'écran Paiements.
  const waitingForPayment = order.status === 'EN_ATTENTE';
  const isPaid = PAID_STATUSES.has(order.status);
  const downloadReceipt = useDownloadReceipt(token);
  const proof = deliveryProofSummary(order);

  async function handleDownloadReceipt() {
    try {
      await downloadReceipt.mutateAsync(order.id);
    } catch (e) {
      toast.error(apiMessage(e, 'Impossible de générer le reçu'));
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            #{order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {new Date(order.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.isPreorder && order.scheduledFor && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 inline-flex items-center gap-1"
              title={`Programmée pour ${formatScheduledFull(order.scheduledFor)}`}
            >
              <CalendarClock size={12} />
              {formatScheduledShort(order.scheduledFor)}
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Replier le détail' : 'Déplier le détail'}
            aria-expanded={open}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-zinc-100 dark:border-dark-border pt-3">
        <div>
          <p className="text-xs text-zinc-500">{order.items.length} article{order.items.length > 1 ? 's' : ''}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {(order.total ?? 0).toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPaid && (
            <button
              onClick={handleDownloadReceipt}
              disabled={downloadReceipt.isPending}
              title="Télécharger le reçu PDF"
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-surface transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={13} />
              {downloadReceipt.isPending ? '...' : 'Reçu'}
            </button>
          )}
          {/* Gestes publiés par le serveur (`allowedActions`, règle R1). */}
          <OrderActions
            order={order}
            role={role}
            pending={pending}
            onStatusUpdate={onStatusUpdate}
            onAccept={onAccept}
            onReject={onReject}
            onHandOverWithCode={onHandOverWithCode}
          />
        </div>
      </div>

      {/* F3-07 — comment la remise est prouvée, et si le paiement peut partir. */}
      {proof && (
        <div
          className={`mx-4 mb-4 px-3 py-2 rounded-lg border text-xs ${
            proof.waiting
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
          }`}
        >
          <p className="font-medium">{proof.label}</p>
          <p className="mt-0.5 opacity-80">{proof.payout}</p>
        </div>
      )}

      {/* Bannière paiement en attente — affichée au RESTAURATEUR qui ne peut pas
          confirmer le paiement lui-même. Renvoie vers l'écran "Paiements". */}
      {waitingForPayment && (
        <Link
          href="/paiements"
          className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors group"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span className="text-xs font-medium">
            Paiement non confirmé — un admin doit valider le virement
          </span>
          <ArrowRight size={12} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}

      {/* Details */}
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-dark-border pt-3 space-y-2">
          {order.isPreorder && order.scheduledFor && (
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 mb-2">
              <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                Programmée pour
              </p>
              <p className="text-sm text-orange-900 dark:text-orange-200 mt-0.5 capitalize">
                {formatScheduledFull(order.scheduledFor)}
              </p>
            </div>
          )}
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.quantite}× {item.product?.nom ?? 'Produit'}
                {item.variantLabel ? ` (${item.variantLabel})` : ''}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">
                {(item.prix ?? 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          ))}
          {order.notes && (
            <p className="text-xs text-zinc-400 italic mt-2">Note: {order.notes}</p>
          )}
          {order.deliveryAddress && (
            <p className="text-xs text-zinc-500 mt-1">📍 {order.deliveryAddress}</p>
          )}

          {/* Livraison — ouvert au vendeur ET à l'admin : le backend autorise
              les deux (`@Roles('RESTAURATEUR','ADMIN')`), et c'est souvent le
              vendeur qui sait quel livreur passe. */}
          <div className="pt-2">
            <AssignDriver order={order} token={token} />
          </div>

          {/* Argent — réservé à l'ADMIN : le vendeur ne doit voir ni la
              commission qu'on retient, ni la marge de la plateforme. Le
              reversement est de toute façon interdit aux autres rôles côté
              serveur ; on ne charge simplement pas la donnée. */}
          {/* F3-05 — échec déclaré, commande pas encore conclue : l'admin
              choisit le responsable (ou réassigne ci-dessus). */}
          {role === 'ADMIN' &&
            order.delivery?.status === 'ECHEC' &&
            (order.status === 'PRET' || order.status === 'EN_ROUTE') && (
              <div className="pt-2">
                <FailureArbitrationPanel orderId={order.id} token={token} />
              </div>
            )}

          {role === 'ADMIN' && (
            <div className="pt-2">
              <OrderFinancialsCard orderId={order.id} token={token} />
            </div>
          )}

          {/* F3-06 — remboursement partiel d'une commande terminée. */}
          {role === 'ADMIN' &&
            (order.status === 'LIVRER' || order.status === 'ECHEC_LIVRAISON') && (
              <div className="pt-2">
                {showRefund ? (
                  <RefundComposer
                    orderId={order.id}
                    token={token}
                    onDone={() => setShowRefund(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRefund(true)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Rembourser une partie de la commande…
                  </button>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

/**
 * Onglet de statut.
 *
 * Le compteur vient de `meta.statusCounts`, calculé par le serveur sur le
 * périmètre entier. Il était auparavant calculé sur la page reçue — vingt
 * lignes arbitraires — et pouvait donc afficher « En attente (2) » quand
 * quarante commandes attendaient.
 */
function StatusTab({
  label,
  count,
  active,
  onClick,
  activeClass = 'bg-primary-500 text-white',
}: {
  label: string;
  count: number | undefined;
  active: boolean;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
        active
          ? activeClass
          : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
      }`}
    >
      {label}
      {count !== undefined ? ` (${count})` : ''}
    </button>
  );
}

/**
 * `?q=` pré-remplit la recherche : c'est ainsi que le cockpit « À traiter »
 * (F3-04) ouvre une commande précise. `useSearchParams` impose une frontière
 * `Suspense`, d'où l'enveloppe.
 */
export default function CommandesPage() {
  return (
    <Suspense fallback={null}>
      <CommandesPageContent />
    </Suspense>
  );
}

function CommandesPageContent() {
  const { token, user } = useAuthStore();
  const role = user?.role;
  const [filterStatus, setFilterStatus] = useState<OrderStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [todayOnly, setTodayOnly] = useState(false);
  const initialSearch = useSearchParams().get('q') ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Debounce 350 ms + retour page 1 : la frappe ne doit pas envoyer une requête
  // par caractère, et rester en page 4 d'une recherche qui n'a qu'une page
  // afficherait un écran vide qui se lit comme « aucun résultat ».
  //
  // Le `setState` est différé par `setTimeout`, jamais synchrone dans l'effet —
  // même pattern que `/clients` et `/livreurs`.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    useAdminOrders({
      token,
      role,
      page,
      status: filterStatus,
      search: debouncedSearch,
    });

  const isSearching = debouncedSearch.trim().length > 0;
  const { mutate: updateStatus } = useUpdateOrderStatus(token);
  const acceptOrder = useAcceptOrder(token);
  const rejectOrder = useRejectOrder(token);
  const handOverPickup = useHandOverPickup(token);

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const statusCounts: OrderStatusCounts = meta?.statusCounts ?? {};
  const totalPages = meta?.totalPages ?? 1;

  // « Tout » compte le périmètre entier, pas la sélection courante : la somme
  // des sept statuts est stable quel que soit l'onglet actif, là où
  // `meta.total` suit le filtre et retomberait à la valeur de l'onglet.
  const totalAllStatuses = STATUS_TABS.reduce(
    (sum, s) => sum + (statusCounts[s] ?? 0),
    0,
  );

  /**
   * Change d'onglet et repart à la première page.
   *
   * Les deux écritures vivent dans le gestionnaire, pas dans un effet : rester
   * en page 4 d'un filtre qui n'en a qu'une afficherait un écran vide, qui se
   * lit comme « aucune commande dans ce statut ».
   */
  function selectStatus(next: OrderStatusFilter) {
    setFilterStatus(next);
    setPage(1);
  }

  // LIL-123 : Pré-commandes programmées pour aujourd'hui (timezone Brazzaville).
  // ⚠️ Ce filtre porte sur la PAGE affichée, faute de filtre serveur sur
  // `scheduledFor`. Le libellé le dit, pour ne pas laisser croire qu'il balaie
  // tout l'historique.
  const todayBzv = brazzavilleDateString(new Date());
  const todayPreorderCount = orders.filter(
    (o) => o.isPreorder && o.scheduledFor && o.status !== 'ANNULER' && brazzavilleDateString(o.scheduledFor) === todayBzv,
  ).length;

  function handleExport() {
    const rows = orders.map((o: AdminOrder) => ({
      ID:         o.id.slice(-8).toUpperCase(),
      Date:       new Date(o.createdAt).toLocaleString('fr-FR'),
      Statut:     STATUS_LABELS[o.status] ?? o.status,
      Client:     o.user?.nom ?? '',
      Telephone:  o.user?.phone ?? o.contactPhone ?? '',
      Articles:   o.items.length,
      Total_FCFA: o.total ?? 0,
      Livraison:  o.isDelivery ? 'Oui' : 'Non',
      Adresse:    o.deliveryAddress ?? '',
    }));
    exportToCsv(
      `commandes_p${page}_${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  }

  function handleStatusUpdate(orderId: string, status: OrderStatus) {
    // Forcer une commande à « Payé » la déclare encaissée et notifie le
    // vendeur, sans qu'aucun paiement n'existe en base. C'est un pouvoir
    // d'administration légitime (règlement hors ligne, rattrapage), pas un
    // raccourci d'exploitation : on demande une confirmation explicite plutôt
    // que de le laisser à un clic de distance d'« En préparation ».
    if (
      status === 'PAYER' &&
      !window.confirm(
        'Marquer cette commande comme payée sans encaissement enregistré ?\n\n' +
          'Le vendeur sera prévenu qu’elle est à préparer. Si le client a payé par ' +
          'Mobile Money, passez plutôt par l’écran Paiements.',
      )
    ) {
      return;
    }

    updateStatus(
      { orderId, status },
      {
        onSuccess: () => toast.success(`Statut mis à jour: ${STATUS_LABELS[status]}`),
        // Le serveur écrit des messages faits pour être lus (« aucun livreur
        // n'a récupéré cette commande ») : les remplacer par « Erreur » jette
        // la seule information exploitable de la réponse.
        onError: (e) => toast.error(apiMessage(e, 'Erreur lors de la mise à jour')),
      },
    );
  }

  function handleAccept(orderId: string, prepMinutes: number) {
    acceptOrder.mutate(
      { orderId, prepMinutes },
      {
        onSuccess: () => toast.success(`Commande acceptée — prête dans ${prepMinutes} min`),
        onError: (e) => toast.error(apiMessage(e, 'Impossible d’accepter la commande')),
      },
    );
  }

  function handleReject(orderId: string, reason: VendorRejectionReason, note?: string) {
    rejectOrder.mutate(
      { orderId, reason, note },
      {
        onSuccess: () => toast.success('Commande refusée — le client est remboursé'),
        onError: (e) => toast.error(apiMessage(e, 'Impossible de refuser la commande')),
      },
    );
  }

  function handleHandOverWithCode(orderId: string, code: string) {
    handOverPickup.mutate(
      { orderId, code },
      {
        onSuccess: () => toast.success('Commande remise — le code du client prouve la remise'),
        // Code faux : le serveur dit combien d'essais il reste.
        onError: (e) => toast.error(apiMessage(e, 'Code refusé')),
      },
    );
  }

  const visible = todayOnly
    ? [...orders]
        .filter(
          (o) =>
            o.isPreorder &&
            o.scheduledFor &&
            o.status !== 'ANNULER' &&
            brazzavilleDateString(o.scheduledFor) === todayBzv,
        )
        // Trié par heure de retrait ascendante : le vendeur voit ce qui arrive
        // en premier.
        .sort((a, b) => {
          const ta = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
          const tb = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
          return ta - tb;
        })
    : orders;

  return (
    <div className="max-w-4xl space-y-4">
      {/* Recherche — appliquée par le serveur sur tout l'historique.
          Sans elle, et avec la pagination, une commande qui n'était pas dans
          les vingt dernières restait inatteignable depuis l'administration. */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher une commande"
          placeholder="Numéro (#A1B2C3D4), client, téléphone ou vendeur…"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <StatusTab
            label="Tout"
            count={totalAllStatuses}
            active={filterStatus === 'ALL'}
            onClick={() => selectStatus('ALL')}
          />
          {STATUS_TABS.map((s) => (
            <StatusTab
              key={s}
              label={STATUS_LABELS[s]}
              count={statusCounts[s] ?? 0}
              active={filterStatus === s}
              onClick={() => selectStatus(s)}
            />
          ))}
          {todayPreorderCount > 0 && (
            <button
              onClick={() => setTodayOnly((v) => !v)}
              aria-pressed={todayOnly}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
                todayOnly
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/15'
              }`}
              title="Pré-commandes programmées pour aujourd'hui, parmi les commandes de cette page"
            >
              <CalendarClock size={12} />
              Aujourd&apos;hui ({todayPreorderCount} sur cette page)
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={orders.length === 0}
            title="Exporter les commandes affichées sur cette page"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> CSV (page)
          </button>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Actualiser"
            aria-label="Actualiser la liste"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* List — un échec de chargement ne doit pas rendre le même écran qu'une
          liste vide : c'est ce qui a rendu le back-office produits muet. */}
      {isError ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-center">
          <AlertCircle size={20} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Impossible de charger les commandes
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
            {apiMessage(error, 'Erreur inconnue')}
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">
            {isSearching
              ? `Aucune commande ne correspond à « ${debouncedSearch.trim()} »`
              : 'Aucune commande'}
            {todayOnly ? ' programmée pour aujourd\'hui sur cette page' : ''}
            {filterStatus !== 'ALL' && !todayOnly ? ` en statut "${STATUS_LABELS[filterStatus]}"` : ''}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              role={role}
              token={token}
              onStatusUpdate={handleStatusUpdate}
              onAccept={handleAccept}
              onReject={handleReject}
              onHandOverWithCode={handleHandOverWithCode}
              pending={
                acceptOrder.isPending ||
                rejectOrder.isPending ||
                handOverPickup.isPending
              }
            />
          ))}
        </div>
      )}

      {/* Pagination — le compte vient du serveur. L'écran affichait vingt
          commandes et seulement vingt, sans que rien ne laisse deviner qu'il y
          en avait d'autres. */}
      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {meta.total.toLocaleString('fr-FR')} commande{meta.total > 1 ? 's' : ''}
            {isSearching ? ` pour « ${debouncedSearch.trim()} »` : ''}
            {filterStatus !== 'ALL' ? ` en statut « ${STATUS_LABELS[filterStatus]} »` : ''}
            {' · page '}{meta.page}/{totalPages}
            {meta.total > ORDERS_PAGE_SIZE ? ` · ${ORDERS_PAGE_SIZE} par page` : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              aria-label="Page précédente"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-surface transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || isFetching}
              aria-label="Page suivante"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-surface transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
