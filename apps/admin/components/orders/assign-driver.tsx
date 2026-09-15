'use client';

import { useState } from 'react';
import {
  assignSuccessMessage,
  canAssignDeliverer,
  useAssignDeliverer,
  useAvailableDeliverers,
  useOrderDelivery,
} from '@lilia/api-client';
import type { AdminOrder, DeliveryStatus } from '@lilia/types';
import { AlertCircle, Bike, Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { apiMessage } from '@/lib/api-message';
import { AvailabilityBadge } from '@/components/drivers/driver-status-badges';

/**
 * Où en est la course, dit du point de vue de celui qui supervise.
 *
 * `ACCEPTER` a son propre libellé : la commande reste `PRET` entre
 * l'acceptation et la récupération — c'est exact, elle est encore sur le
 * comptoir — mais l'opérateur doit savoir qu'un livreur est en chemin vers le
 * commerce. Confondre les deux est précisément ce que la séparation
 * `ACCEPTER` / `EN_TRANSIT` a corrigé côté backend en août.
 */
const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  EN_ATTENTE: 'Course créée, aucun livreur',
  ASSIGNER: 'Assigné — en attente de sa réponse',
  ACCEPTER: 'A accepté, vient récupérer la commande',
  EN_TRANSIT: 'Parti avec la commande',
  LIVRER: 'Livrée',
  ECHEC: 'Échec de livraison — action requise',
};

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  EN_ATTENTE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  ASSIGNER: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  ACCEPTER: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  EN_TRANSIT:
    'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  LIVRER:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  ECHEC: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

/** Une course engagée : inutile de proposer d'en assigner un autre en premier réflexe. */
const ENGAGED: DeliveryStatus[] = ['ASSIGNER', 'ACCEPTER', 'EN_TRANSIT'];

/**
 * Assignation et réassignation d'un livreur, depuis le détail d'une commande.
 *
 * ## Pourquoi ce composant existe
 *
 * `lilia-food-web` n'appelait **aucune** route `/deliveries/*`. Confier une
 * commande prête à un livreur — le geste le plus fréquent de la journée d'un
 * opérateur — n'était possible que depuis l'application Flutter. Un opérateur
 * travaillant sur le Web ne pouvait ni assigner, ni réassigner après un échec,
 * ni même savoir qui portait une commande.
 *
 * ## Ce que le composant ne fait pas
 *
 * Il ne refiltre pas la liste des livreurs : le serveur l'a déjà réduite aux
 * comptes actifs, profils en service et livreurs non hors-ligne, avec **la
 * même condition** que le contrôle d'écriture. La refaire ici la ferait
 * diverger, et l'interface proposerait des livreurs que l'assignation refuse —
 * ou l'inverse, ce qui est pire.
 */
export function AssignDriver({
  order,
  token,
}: {
  order: AdminOrder;
  token: string | null;
}) {
  const [selected, setSelected] = useState('');

  const deliveryQuery = useOrderDelivery(order.id, token);
  const deliverersQuery = useAvailableDeliverers(token);
  const assign = useAssignDeliverer(token);

  const delivery = deliveryQuery.data;
  const assignable = canAssignDeliverer(order.status, order.isDelivery);

  // Un retrait au comptoir n'a pas de course : ne rien afficher vaut mieux
  // qu'un bloc « aucun livreur » qui suggère qu'il en manque un.
  if (!order.isDelivery) return null;

  async function handleAssign() {
    if (!selected) return;

    const current = delivery?.deliverer;
    // Réassigner n'est pas neutre : le serveur libère l'ancien livreur et le
    // prévient que la mission lui a été retirée. Il peut être en route.
    if (
      current &&
      !window.confirm(
        `Retirer la course à ${current.nom ?? 'le livreur actuel'} et la confier ` +
          'à un autre livreur ?\n\n' +
          'Le livreur actuel sera prévenu et redeviendra disponible. ' +
          "S'il est déjà en route, prévenez-le aussi par téléphone.",
      )
    ) {
      return;
    }

    try {
      const res = await assign.mutateAsync({
        orderId: order.id,
        delivererId: selected,
      });
      // Le serveur dit « réassigné — le précédent a été libéré » quand
      // quelqu'un vient d'être décroché d'une course. Rien d'autre ne le dit.
      toast.success(assignSuccessMessage(res));
      setSelected('');
    } catch (e) {
      // Le serveur nomme la personne et la raison : « X n'est pas en service »,
      // « X a un compte BLOCKED ». Les remplacer par « Erreur » jetterait la
      // seule information exploitable de la réponse.
      toast.error(apiMessage(e, "Impossible d'assigner ce livreur"));
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-dark-border dark:bg-dark-surface/40">
      <div className="mb-2 flex items-center gap-1.5">
        <Bike size={14} className="text-zinc-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Livraison
        </h4>
      </div>

      {/* État de la course. Une erreur de chargement ne doit surtout pas se
          présenter comme « aucun livreur » : c'est le défaut relevé côté
          Flutter, où un 403 et une commande sans course produisaient le même
          écran. */}
      {deliveryQuery.isError ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              État de la course indisponible
            </p>
            <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400/80">
              {apiMessage(deliveryQuery.error, 'Erreur inconnue')}
            </p>
            <button
              onClick={() => void deliveryQuery.refetch()}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
            >
              <RefreshCw size={11} /> Réessayer
            </button>
          </div>
        </div>
      ) : deliveryQuery.isLoading ? (
        <p className="mb-3 text-xs text-zinc-400">Chargement de la course…</p>
      ) : delivery ? (
        <div className="mb-3 space-y-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${DELIVERY_STATUS_COLORS[delivery.status]}`}
          >
            {DELIVERY_STATUS_LABELS[delivery.status]}
          </span>
          {delivery.deliverer && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-700 dark:text-zinc-300">
              <span className="font-medium">
                {delivery.deliverer.nom ?? 'Livreur'}
              </span>
              {delivery.deliverer.phone && (
                <a
                  href={`tel:${delivery.deliverer.phone}`}
                  className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
                >
                  <Phone size={11} />
                  {delivery.deliverer.phone}
                </a>
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Aucun livreur assigné.
        </p>
      )}

      {/* Assignation. Le bloc disparaît quand le serveur refuserait le geste —
          plutôt que d'afficher un bouton qui répondra 400. */}
      {!assignable ? (
        <p className="text-[11px] text-zinc-400">
          {order.status === 'EN_ATTENTE'
            ? 'Un livreur ne peut être assigné qu’après le paiement.'
            : 'Cette commande est terminée : plus de livreur à assigner.'}
        </p>
      ) : deliverersQuery.isError ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          Liste des livreurs indisponible —{' '}
          {apiMessage(deliverersQuery.error, 'erreur inconnue')}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Choisir un livreur"
            disabled={deliverersQuery.isLoading || assign.isPending}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-primary-500 focus:outline-none disabled:opacity-50 dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
          >
            <option value="">
              {deliverersQuery.isLoading
                ? 'Chargement…'
                : (deliverersQuery.data?.length ?? 0) === 0
                  ? 'Aucun livreur disponible'
                  : delivery?.deliverer
                    ? 'Choisir un autre livreur…'
                    : 'Choisir un livreur…'}
            </option>
            {(deliverersQuery.data ?? [])
              // Proposer le livreur déjà en place n'aurait aucun effet : le
              // serveur refuse la réassignation à l'identique par un 400.
              .filter((d) => d.id !== delivery?.deliverer?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom ?? 'Sans nom'}
                  {d._count.deliveries > 0
                    ? ` — ${d._count.deliveries} course${d._count.deliveries > 1 ? 's' : ''} en cours`
                    : ' — libre'}
                </option>
              ))}
          </select>

          <button
            onClick={handleAssign}
            disabled={!selected || assign.isPending}
            className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:hover:bg-primary-500"
          >
            {assign.isPending
              ? '…'
              : delivery && ENGAGED.includes(delivery.status)
                ? 'Réassigner'
                : 'Assigner'}
          </button>

          {selected && (
            <AvailabilityBadge
              status={
                deliverersQuery.data?.find((d) => d.id === selected)
                  ?.driverStatus ?? null
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
