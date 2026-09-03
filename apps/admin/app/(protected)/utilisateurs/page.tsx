'use client';

import { useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAdminUser,
  useAdminUsers,
  useBanUser,
  useUnbanUser,
  useUpdateUserRole,
} from '@lilia/api-client';
import type { Role, StatusUser } from '@lilia/types';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Gestion des comptes.
 *
 * Les endpoints `/admin/users`, `/role`, `/ban` et `/unban` existaient depuis
 * août, étaient testés et audités — et n'avaient **aucun appelant** dans les
 * trois back-offices. Changer un rôle ou suspendre un compte supposait un appel
 * HTTP à la main. Or le bannissement est le seul geste qui révoque une session
 * immédiatement : sans écran, il n'y avait aucune réponse opérationnelle à un
 * compte compromis.
 */

const ROLES: Role[] = ['CLIENT', 'RESTAURATEUR', 'LIVREUR', 'ADMIN'];

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  RESTAURATEUR: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  LIVREUR: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  CLIENT: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function UtilisateursPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | undefined>();
  const [statusUser, setStatusUser] = useState<StatusUser | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, isPlaceholderData } = useAdminUsers(token, {
    page,
    search: search.trim() || undefined,
    role,
    statusUser,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, e-mail ou téléphone"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
          />
        </div>

        <select
          value={role ?? ''}
          onChange={(e) => {
            setRole((e.target.value || undefined) as Role | undefined);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-primary-500 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-zinc-300"
        >
          <option value="">Rôle : tous</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={statusUser ?? ''}
          onChange={(e) => {
            setStatusUser((e.target.value || undefined) as StatusUser | undefined);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-primary-500 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-zinc-300"
        >
          <option value="">Statut : tous</option>
          <option value="ACTIVE">Actif</option>
          <option value="BLOCKED">Suspendu</option>
          <option value="DELETED">Supprimé</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card dark:border-dark-border dark:bg-dark-card">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les comptes.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <Users size={28} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">Aucun compte ne correspond.</p>
          </div>
        ) : (
          <div
            className={`divide-y divide-zinc-100 dark:divide-dark-border ${
              isPlaceholderData ? 'opacity-60' : ''
            }`}
          >
            {data.data.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800">
                  {(u.nom || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {u.nom || '—'}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{u.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[u.role]}`}
                >
                  {u.role}
                </span>
                {u.statusUser !== 'ACTIVE' && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    {u.statusUser === 'BLOCKED' ? 'Suspendu' : u.statusUser}
                  </span>
                )}
                <UserCog size={15} className="shrink-0 text-zinc-300" />
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-dark-border">
            <span className="text-xs text-zinc-400">
              Page {page} sur {totalPages} · {data?.total} comptes
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <UserDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

/**
 * Fiche d'un compte, avec les deux gestes sensibles.
 *
 * `restaurant` et `driverProfile` y sont affichés parce qu'ils **conditionnent**
 * ce que l'administrateur a le droit de faire : le serveur refuse de retirer le
 * rôle RESTAURATEUR au propriétaire d'une boutique, et le montrer ici évite de
 * découvrir le refus après coup.
 */
function UserDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { token } = useAuthStore();
  const { data: user, isLoading } = useAdminUser(token, id);
  const updateRole = useUpdateUserRole(token);
  const ban = useBanUser(token);
  const unban = useUnbanUser(token);
  const [newRole, setNewRole] = useState<Role | ''>('');

  async function handleRoleChange() {
    if (!newRole || !user) return;

    // Confirmation explicite : un changement de rôle modifie les accès, et
    // certaines transitions sont irréversibles côté métier.
    const ok = window.confirm(
      `Vous êtes sur le point de changer le rôle de ${user.nom ?? user.email} ` +
        `de ${user.role} vers ${newRole}.\n\n` +
        'Cette action modifie ses accès à Lilia Food. Continuer ?',
    );
    if (!ok) return;

    try {
      await updateRole.mutateAsync({ id, role: newRole });
      toast.success(`Rôle mis à jour : ${newRole}`);
      setNewRole('');
    } catch (err) {
      // Le serveur refuse (409) si le compte tient une boutique ou porte une
      // course en cours. Son message nomme la boutique ou la commande.
      toast.error((err as Error).message);
    }
  }

  async function handleBan() {
    if (!user) return;
    const reason = window.prompt(
      `Suspendre ${user.nom ?? user.email} ?\n\n` +
        'Son compte Firebase sera désactivé et ses sessions révoquées. ' +
        'Ses commandes et paiements sont conservés — ce n’est pas une suppression.\n\n' +
        'Motif (facultatif) :',
    );
    if (reason === null) return;
    try {
      const res = await ban.mutateAsync({ id, reason: reason || undefined });
      toast.success(res.message);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleUnban() {
    try {
      const res = await unban.mutateAsync(id);
      toast.success(res.message);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-card">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Fiche du compte
          </h2>
          <button onClick={onClose} aria-label="Fermer">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {isLoading || !user ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row label="Nom" value={user.nom ?? '—'} />
              <Row label="E-mail" value={user.email} />
              <Row label="Téléphone" value={user.phone ?? '—'} />
              <Row label="Rôle actuel" value={user.role} />
              <Row label="Statut" value={user.statusUser} />
              <Row
                label="Dernière connexion"
                value={
                  user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString('fr-FR')
                    : 'Jamais'
                }
              />
            </dl>

            {(user.restaurant || user.driverProfile) && (
              <div className="rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
                {user.restaurant && (
                  <p className="text-zinc-600 dark:text-zinc-300">
                    Propriétaire de <strong>{user.restaurant.nom}</strong> (
                    {user.restaurant.onboardingStatus}). Le rôle RESTAURATEUR ne
                    peut pas lui être retiré tant que la boutique lui est
                    rattachée.
                  </p>
                )}
                {user.driverProfile && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                    Profil livreur{' '}
                    {user.driverProfile.isActive ? 'actif' : 'inactif'} (
                    {user.driverProfile.vehicleType}).
                  </p>
                )}
              </div>
            )}

            {/* ─── Changement de rôle ─────────────────────────────────── */}
            <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-dark-border">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Changer le rôle
              </p>
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role | '')}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-surface dark:text-zinc-100"
                >
                  <option value="">Choisir un rôle…</option>
                  {ROLES.filter((r) => r !== user.role).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRoleChange}
                  disabled={!newRole || updateRole.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
                >
                  {updateRole.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Appliquer
                </button>
              </div>
              {user.role === 'LIVREUR' && (
                <p className="text-xs text-zinc-400">
                  Quitter le rôle LIVREUR désactive son profil métier — les
                  informations (véhicule, permis) sont conservées.
                </p>
              )}
            </div>

            {/* ─── Bannissement ───────────────────────────────────────── */}
            <div className="border-t border-zinc-100 pt-4 dark:border-dark-border">
              {user.statusUser === 'BLOCKED' ? (
                <button
                  onClick={handleUnban}
                  disabled={unban.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  {unban.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  Lever la suspension
                </button>
              ) : (
                <button
                  onClick={handleBan}
                  disabled={ban.isPending || user.role === 'ADMIN'}
                  title={
                    user.role === 'ADMIN'
                      ? 'Un compte ADMIN ne peut pas être suspendu via l’interface.'
                      : undefined
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {ban.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Ban size={15} />
                  )}
                  Suspendre le compte
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="truncate text-sm text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}
