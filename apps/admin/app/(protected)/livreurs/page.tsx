'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowIcon,
  Package,
  Phone,
  Plus,
  Search,
} from 'lucide-react';
import { useAdminDrivers } from '@lilia/api-client';
import type { DriverStatus, StatusUser } from '@lilia/types';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateDriverPanel } from '@/components/drivers/create-driver-panel';
import {
  AccountBadge,
  AvailabilityBadge,
  ProfileBadge,
  VEHICLE_LABELS,
} from '@/components/drivers/driver-status-badges';

/**
 * Liste des livreurs.
 *
 * L'écran était strictement en lecture : ni création, ni activation, ni même
 * l'affichage de la disponibilité. Créer un livreur supposait de le faire
 * s'inscrire dans l'application client puis d'appeler l'API à la main.
 *
 * Les trois filtres correspondent aux trois statuts, qui portent sur trois
 * objets différents — le compte, le profil métier et la disponibilité du
 * moment. Les fondre en un seul « statut » obligerait à choisir lequel
 * l'emporte, ce qu'aucune règle métier ne dit.
 */
export default function LivreursPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [driverStatus, setDriverStatus] = useState<DriverStatus | undefined>();
  const [statusUser, setStatusUser] = useState<StatusUser | undefined>();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, isPlaceholderData } = useAdminDrivers(token, {
    page,
    search: search.trim() || undefined,
    isActive,
    driverStatus,
    statusUser,
  });

  const totalPages = data?.meta.totalPages ?? 1;

  /** Toute modification de filtre ramène en page 1 — sinon on tombe dans le vide. */
  const withReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  return (
    <div className="max-w-5xl space-y-4">
      {/* Barre d'action */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={search}
            onChange={(e) => withReset(setSearch)(e.target.value)}
            placeholder="Nom, e-mail ou téléphone"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
          />
        </div>

        <FilterSelect
          value={isActive === undefined ? '' : String(isActive)}
          onChange={(v) =>
            withReset(setIsActive)(v === '' ? undefined : v === 'true')
          }
          options={[
            { value: '', label: 'Profil : tous' },
            { value: 'true', label: 'En service' },
            { value: 'false', label: 'Hors service' },
          ]}
        />

        <FilterSelect
          value={driverStatus ?? ''}
          onChange={(v) =>
            withReset(setDriverStatus)((v || undefined) as DriverStatus | undefined)
          }
          options={[
            { value: '', label: 'Dispo : toutes' },
            { value: 'AVAILABLE', label: 'Disponible' },
            { value: 'ON_DELIVERY', label: 'En livraison' },
            { value: 'OFFLINE', label: 'Hors ligne' },
          ]}
        />

        <FilterSelect
          value={statusUser ?? ''}
          onChange={(v) =>
            withReset(setStatusUser)((v || undefined) as StatusUser | undefined)
          }
          options={[
            { value: '', label: 'Compte : tous' },
            { value: 'ACTIVE', label: 'Actif' },
            { value: 'BLOCKED', label: 'Suspendu' },
          ]}
        />

        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <Plus size={15} />
          Ajouter un livreur
        </button>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card dark:border-dark-border dark:bg-dark-card">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les livreurs.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <Bike size={28} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">
              {search || isActive !== undefined || driverStatus || statusUser
                ? 'Aucun livreur ne correspond à ces filtres.'
                : 'Aucun livreur. Commencez par en ajouter un.'}
            </p>
          </div>
        ) : (
          <div
            className={`divide-y divide-zinc-100 dark:divide-dark-border ${
              isPlaceholderData ? 'opacity-60' : ''
            }`}
          >
            {data.data.map((d) => {
              const name = d.nom || d.email;
              return (
                <Link
                  key={d.id}
                  href={`/livreurs/${d.id}`}
                  className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {d.imageUrl ? (
                      <Image
                        src={d.imageUrl}
                        alt={name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {d.nom || '—'}
                      </p>
                      {d.driverProfile && (
                        <span className="shrink-0 text-xs text-zinc-400">
                          {VEHICLE_LABELS[d.driverProfile.vehicleType]}
                          {d.driverProfile.plateNumber
                            ? ` · ${d.driverProfile.plateNumber}`
                            : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <AccountBadge status={d.statusUser} />
                      <ProfileBadge isActive={d.driverProfile?.isActive} />
                      <AvailabilityBadge status={d.driverStatus} />
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center gap-4 text-xs text-zinc-400 sm:flex">
                    {d.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {d.phone}
                      </span>
                    )}
                    {!!d._count?.deliveries && (
                      <span className="flex items-center gap-1 font-medium text-orange-500">
                        <Package size={11} />
                        {d._count.deliveries} en cours
                      </span>
                    )}
                  </div>

                  <ArrowIcon
                    size={15}
                    className="shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500"
                  />
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-dark-border">
            <span className="text-xs text-zinc-400">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {creating && <CreateDriverPanel onClose={() => setCreating(false)} />}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-border dark:bg-dark-card dark:text-zinc-300"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
