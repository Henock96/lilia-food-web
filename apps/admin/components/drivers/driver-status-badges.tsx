'use client';

import type { DriverStatus, StatusUser, VehicleType } from '@lilia/types';

/**
 * Les trois statuts d'un livreur, affichés **séparément**.
 *
 * Les fondre en un seul « statut » obligerait à inventer une règle de fusion,
 * et cette règle serait fausse : « compte actif, profil actif, hors ligne »
 * décrit un livreur qui a simplement fini sa journée — ce n'est ni une
 * anomalie, ni une suspension. L'application livreur affichait au contraire
 * « Statut compte : Actif » en dur, y compris pour un compte suspendu.
 *
 * | Badge         | Répond à                          | Décidé par        |
 * |---------------|-----------------------------------|-------------------|
 * | Compte        | le compte est-il valide ?         | admin (ban)       |
 * | Profil        | est-il en service ?               | admin (activation)|
 * | Disponibilité | est-il joignable maintenant ?     | le livreur        |
 */

const PILL =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap';

export function AccountBadge({ status }: { status: StatusUser }) {
  const map: Record<StatusUser, { label: string; cls: string }> = {
    ACTIVE: {
      label: 'Compte actif',
      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    },
    BLOCKED: {
      label: 'Compte suspendu',
      cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    },
    DELETED: {
      label: 'Compte supprimé',
      cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    },
    INACTIVE: {
      label: 'Compte inactif',
      cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    },
  };
  const { label, cls } = map[status] ?? map.INACTIVE;
  return <span className={`${PILL} ${cls}`}>{label}</span>;
}

export function ProfileBadge({ isActive }: { isActive: boolean | undefined }) {
  if (isActive === undefined) {
    return (
      <span className={`${PILL} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`}>
        Sans profil
      </span>
    );
  }
  return (
    <span
      className={`${PILL} ${
        isActive
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
      }`}
    >
      {isActive ? 'En service' : 'Hors service'}
    </span>
  );
}

export function AvailabilityBadge({ status }: { status: DriverStatus | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    AVAILABLE: {
      label: 'Disponible',
      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    },
    ON_DELIVERY: {
      label: 'En livraison',
      cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    },
    OFFLINE: {
      label: 'Hors ligne',
      cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    },
  };
  // `null` = ne s'est jamais déclaré. Distinct de « hors ligne », qui est une
  // décision ; ici, on n'a simplement pas l'information.
  const entry = status
    ? map[status]
    : {
        label: 'Jamais connecté',
        cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
      };
  return <span className={`${PILL} ${entry.cls}`}>{entry.label}</span>;
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTO: 'Moto',
  VELO: 'Vélo',
  VOITURE: 'Voiture',
  PIETON: 'À pied',
};

/** Les seuls véhicules qui portent une immatriculation. */
export const VEHICLES_WITH_PLATE: VehicleType[] = ['MOTO', 'VOITURE'];
