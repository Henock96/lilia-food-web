# LIL-79 Admin Web — Pages Paiements, Livreurs, Zones & Paramètres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les 4 pages manquantes du dashboard admin web — Paiements, Livreurs, Zones, Paramètres — chacune branchée sur un endpoint backend existant, avec leurs entrées de navigation.

**Architecture:** App Next.js 16 (`lilia-food-web/apps/admin`). Chaque page suit le pattern établi (`'use client'`, hook TanStack Query, états loading/erreur/vide). Types partagés dans `@lilia/types`, hooks dans `@lilia/api-client`. Routing par fichier (`app/(protected)/<nom>/page.tsx`).

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, TypeScript strict, Tailwind v4, `sonner` (toasts). Pas de framework de test → vérification par `pnpm type-check` + `pnpm build` + revue.

**Périmètre :** Chantier 4 de LIL-79 (volet web). Les endpoints backend sont tous livrés : `GET /admin/payments`, `POST /payments/:id/confirm`, `GET /admin/deliverers`, `GET /quartiers`, `GET`/`PATCH /admin/platform-settings`.

**Prérequis :** Le backend (LIL-79 + module `platform-settings`) doit être déployé sur Render pour la vérification navigateur. Le type-check et la revue restent valables sans déploiement.

---

## Contexte du code existant

- `apiClient` (`packages/api-client/src/client.ts`) déballe `json.data ?? json`. `apiClientRaw` conserve l'enveloppe complète `{ data, total, page, limit }` — à utiliser pour les listes paginées.
- Pattern hook : `'use client'`, objet `xxxKeys`, `enabled: !!token`, `keepPreviousData` pour les listes paginées. Mutations : `useMutation` + `queryClient.invalidateQueries`.
- Pages : `apps/admin/app/(protected)/<nom>/page.tsx` — routées automatiquement par Next.js.
- `components/layout/sidebar.tsx` : tableau `navItems` (`{ href, label, icon, badge }`), icônes `lucide-react`.
- `components/layout/header.tsx` : map `pageTitles` (chemin → titre).
- `Skeleton` depuis `@/components/ui/skeleton` ; `useAuthStore()` fournit `token` ; `toast` depuis `sonner`.
- Classes Tailwind : `bg-white dark:bg-dark-card`, `rounded-2xl`, `border-zinc-200 dark:border-dark-border`, `shadow-card`, `text-primary-500`.
- Réponses backend : `/admin/payments` et `/admin/deliverers` → `{ data, total, page, limit }` ; `/quartiers` → `{ data, count }` ; `/admin/platform-settings` → `{ data }`.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `packages/types/src/index.ts` | Types `AdminPayment`, `AdminDeliverer`, `PlatformSettings` | Modifier |
| `packages/api-client/src/hooks/admin-operations.ts` | Hooks des 4 pages | Créer |
| `packages/api-client/src/index.ts` | Export barrel | Modifier |
| `apps/admin/components/layout/sidebar.tsx` | 4 entrées de nav | Modifier |
| `apps/admin/components/layout/header.tsx` | 4 titres de page | Modifier |
| `apps/admin/app/(protected)/paiements/page.tsx` | Page Paiements | Créer |
| `apps/admin/app/(protected)/livreurs/page.tsx` | Page Livreurs | Créer |
| `apps/admin/app/(protected)/zones/page.tsx` | Page Zones | Créer |
| `apps/admin/app/(protected)/parametres/page.tsx` | Page Paramètres | Créer |

---

## Task 1: Types partagés

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Ajouter les interfaces**

À la fin de `packages/types/src/index.ts`, ajouter :

```typescript
/** Un paiement dans la liste admin (GET /admin/payments). */
export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: PaymentStatus;
  provider: string;
  createdAt: string;
  order: {
    id: string;
    total: number;
    status: string;
    user: { id: string; nom: string | null; phone: string | null } | null;
  } | null;
}

/** Un livreur dans la liste admin (GET /admin/deliverers). */
export interface AdminDeliverer {
  id: string;
  email: string | null;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  createdAt: string;
  deliveries: { id: string; status: string; createdAt: string }[];
  _count: { deliveries: number };
}

/** Configuration plateforme (GET/PATCH /admin/platform-settings). */
export interface PlatformSettings {
  id: string;
  serviceFeePercent: number;
  loyaltyPointsPer100Xaf: number;
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
  referrerBonusPoints: number;
  referredBonusPoints: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}
```

`PaymentStatus` est déjà exporté par ce fichier (utilisé par l'interface `Payment`).

- [ ] **Step 2: Vérifier le type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add AdminPayment, AdminDeliverer, PlatformSettings types"
```

---

## Task 2: Hooks des 4 pages

**Files:**
- Create: `packages/api-client/src/hooks/admin-operations.ts`
- Modify: `packages/api-client/src/index.ts`

- [ ] **Step 1: Créer `admin-operations.ts`**

```typescript
'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type {
  Paginated,
  AdminPayment,
  AdminDeliverer,
  Quartier,
  PlatformSettings,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminOpsKeys = {
  payments: (page: number, status: string) => ['admin', 'payments', page, status] as const,
  deliverers: (page: number) => ['admin', 'deliverers', page] as const,
  quartiers: ['admin', 'quartiers'] as const,
  platformSettings: ['admin', 'platform-settings'] as const,
};

/** Paiements paginés, filtrables par statut (GET /admin/payments). */
export function useAdminPayments(token: string | null, page: number, status: string) {
  return useQuery({
    queryKey: adminOpsKeys.payments(page, status),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', status });
      return apiClientRaw<Paginated<AdminPayment>>(`/admin/payments?${params.toString()}`, { token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** Confirmation manuelle d'un paiement (POST /payments/:id/confirm). */
export function useConfirmPayment(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiClient<unknown>(`/payments/${paymentId}/confirm`, { method: 'POST', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
  });
}

/** Livreurs paginés (GET /admin/deliverers). */
export function useAdminDeliverers(token: string | null, page: number) {
  return useQuery({
    queryKey: adminOpsKeys.deliverers(page),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      return apiClientRaw<Paginated<AdminDeliverer>>(`/admin/deliverers?${params.toString()}`, { token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Référentiel des quartiers (GET /quartiers). */
export function useQuartiers(token: string | null) {
  return useQuery({
    queryKey: adminOpsKeys.quartiers,
    queryFn: () => apiClient<Quartier[]>('/quartiers', { token }),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}

/** Configuration plateforme (GET /admin/platform-settings). */
export function usePlatformSettings(token: string | null) {
  return useQuery({
    queryKey: adminOpsKeys.platformSettings,
    queryFn: () => apiClient<PlatformSettings>('/admin/platform-settings', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Mise à jour de la configuration plateforme (PATCH /admin/platform-settings). */
export function useUpdatePlatformSettings(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<PlatformSettings>) =>
      apiClient<PlatformSettings>('/admin/platform-settings', {
        method: 'PATCH',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(adminOpsKeys.platformSettings, data);
    },
  });
}
```

Note : `/quartiers` renvoie `{ data, count }` ; `apiClient` déballe `data` → on récupère le tableau `Quartier[]`. Les listes paginées (`/admin/payments`, `/admin/deliverers`) utilisent `apiClientRaw` pour garder `total`.

- [ ] **Step 2: Exporter depuis le barrel**

Dans `packages/api-client/src/index.ts`, ajouter à la fin :

```typescript
export * from './hooks/admin-operations';
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add packages/api-client/src/hooks/admin-operations.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): add hooks for payments, deliverers, quartiers, platform settings"
```

---

## Task 3: Navigation — sidebar + header

**Files:**
- Modify: `apps/admin/components/layout/sidebar.tsx`
- Modify: `apps/admin/components/layout/header.tsx`

- [ ] **Step 1: Ajouter les 4 entrées au sidebar**

Dans `sidebar.tsx`, ajouter `CreditCard`, `Bike`, `MapPin`, `Settings` à l'import `lucide-react` (à la liste existante des icônes).

Puis, dans le tableau `navItems`, ajouter ces 4 entrées **après** la ligne `/promos` :

```typescript
  { href: '/paiements',   label: 'Paiements',   icon: CreditCard,      badge: false },
  { href: '/livreurs',    label: 'Livreurs',    icon: Bike,            badge: false },
  { href: '/zones',       label: 'Zones',        icon: MapPin,          badge: false },
  { href: '/parametres',  label: 'Paramètres',  icon: Settings,        badge: false },
```

- [ ] **Step 2: Ajouter les 4 titres au header**

Dans `header.tsx`, dans l'objet `pageTitles`, ajouter :

```typescript
  '/paiements': 'Paiements',
  '/livreurs': 'Livreurs',
  '/zones': 'Zones',
  '/parametres': 'Paramètres',
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/layout/sidebar.tsx apps/admin/components/layout/header.tsx
git commit -m "feat(admin-web): add Paiements/Livreurs/Zones/Paramètres nav entries"
```

---

## Task 4: Page Paiements

**Files:**
- Create: `apps/admin/app/(protected)/paiements/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
'use client';

import { useState } from 'react';
import { useAdminPayments, useConfirmPayment } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Check, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', SUCCESS: 'Confirmé', FAILED: 'Échoué', CANCELLED: 'Annulé',
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  SUCCESS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  FAILED: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function PaiementsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminPayments(token, page, status);
  const confirm = useConfirmPayment(token);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  function handleConfirm(id: string) {
    confirm.mutate(id, {
      onSuccess: () => toast.success('Paiement confirmé'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de la confirmation'),
    });
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Filtres statut */}
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              status === s
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les paiements.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <CreditCard size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun paiement « {STATUS_LABELS[status]} »</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">
                      #{p.order?.id.slice(-6).toUpperCase() ?? '—'}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? ''}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                    {p.order?.user?.nom || '—'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Phone size={10} />{p.phoneNumber}</span>
                    <span>{p.provider}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {p.amount.toLocaleString('fr-FR')} <span className="text-xs font-normal text-zinc-400">{p.currency}</span>
                  </p>
                </div>
                {p.status === 'PENDING' && (
                  <button
                    onClick={() => handleConfirm(p.id)}
                    disabled={confirm.isPending}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Check size={13} /> Confirmer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {data.total} paiement{data.total > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/\(protected\)/paiements/page.tsx
git commit -m "feat(admin-web): add Paiements page with status filter and confirm action"
```

---

## Task 5: Page Livreurs

**Files:**
- Create: `apps/admin/app/(protected)/livreurs/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useAdminDeliverers } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ChevronLeft, ChevronRight, Mail, Phone, Package } from 'lucide-react';

export default function LivreursPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminDeliverers(token, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les livreurs.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <Bike size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun livreur</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((d) => {
              const name = d.nom || d.email || '—';
              const lastDelivery = d.deliveries[0] ?? null;
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {d.imageUrl ? (
                      <Image src={d.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{d.nom || '—'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.email && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                          <Mail size={10} />{d.email}
                        </span>
                      )}
                      {d.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                          <Phone size={10} />{d.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <Package size={11} className="text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {d._count.deliveries}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lastDelivery
                        ? `Dernière : ${new Date(lastDelivery.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                        : 'Aucune livraison'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {data.total} livreur{data.total > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/\(protected\)/livreurs/page.tsx
git commit -m "feat(admin-web): add Livreurs page"
```

---

## Task 6: Page Zones

Page en lecture seule : le référentiel des quartiers de Brazzaville. La gestion des zones de livraison est par-restaurant (hors périmètre admin global).

**Files:**
- Create: `apps/admin/app/(protected)/zones/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
'use client';

import { useQuartiers } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

export default function ZonesPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = useQuartiers(token);

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-xs text-zinc-400">
        Référentiel des quartiers couverts. La configuration des zones de livraison et de leurs
        tarifs se fait au niveau de chaque restaurant.
      </p>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Quartiers{data ? ` (${data.length})` : ''}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les quartiers.</p>
          </div>
        ) : !data?.length ? (
          <div className="px-5 py-12 text-center">
            <MapPin size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun quartier</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <MapPin size={12} className="text-primary-500 shrink-0" />
                <span className="truncate">{q.nom}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/\(protected\)/zones/page.tsx
git commit -m "feat(admin-web): add Zones page (quartiers reference)"
```

---

## Task 7: Page Paramètres

Formulaire de configuration plateforme. Charge via `usePlatformSettings`, édite dans un état local, enregistre via `useUpdatePlatformSettings` (PATCH).

**Files:**
- Create: `apps/admin/app/(protected)/parametres/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { usePlatformSettings, useUpdatePlatformSettings } from '@lilia/api-client';
import type { PlatformSettings } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/** Clés des champs numériques de la configuration. */
type NumberFieldKey =
  | 'serviceFeePercent'
  | 'loyaltyPointsPer100Xaf'
  | 'loyaltyPointValueXaf'
  | 'loyaltyMinRedemption'
  | 'referrerBonusPoints'
  | 'referredBonusPoints';

/** Champs numériques éditables : clé → libellé + suffixe. */
const NUMBER_FIELDS: { key: NumberFieldKey; label: string; suffix: string; section: string }[] = [
  { key: 'serviceFeePercent',      label: 'Frais de service',           suffix: '%',      section: 'Frais de service' },
  { key: 'loyaltyPointsPer100Xaf', label: 'Points gagnés / 100 XAF',    suffix: 'pts',    section: 'Fidélité' },
  { key: 'loyaltyPointValueXaf',   label: 'Valeur d’un point',      suffix: 'XAF',    section: 'Fidélité' },
  { key: 'loyaltyMinRedemption',   label: 'Seuil minimum d’usage',  suffix: 'pts',    section: 'Fidélité' },
  { key: 'referrerBonusPoints',    label: 'Bonus parrain',              suffix: 'pts',    section: 'Parrainage' },
  { key: 'referredBonusPoints',    label: 'Bonus filleul',              suffix: 'pts',    section: 'Parrainage' },
];
const SECTIONS = ['Frais de service', 'Fidélité', 'Parrainage'];

export default function ParametresPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = usePlatformSettings(token);
  const update = useUpdatePlatformSettings(token);
  const [form, setForm] = useState<PlatformSettings | null>(null);

  // Initialise le formulaire local quand les données arrivent
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-500">Impossible de charger la configuration.</p>;
  }

  function setNumber(key: NumberFieldKey, raw: string) {
    const n = Number(raw);
    setForm((f) => (f ? { ...f, [key]: Number.isFinite(n) ? n : 0 } : f));
  }

  function handleSave() {
    if (!form) return;
    update.mutate(
      {
        serviceFeePercent: form.serviceFeePercent,
        loyaltyPointsPer100Xaf: form.loyaltyPointsPer100Xaf,
        loyaltyPointValueXaf: form.loyaltyPointValueXaf,
        loyaltyMinRedemption: form.loyaltyMinRedemption,
        referrerBonusPoints: form.referrerBonusPoints,
        referredBonusPoints: form.referredBonusPoints,
        maintenanceMode: form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage,
      },
      {
        onSuccess: () => toast.success('Configuration enregistrée'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement'),
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {SECTIONS.map((section) => (
        <div key={section} className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{section}</h3>
          <div className="space-y-3">
            {NUMBER_FIELDS.filter((f) => f.section === section).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={String(form[f.key])}
                    onChange={(e) => setNumber(f.key, e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-sm text-right rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary-500 tabular-nums"
                  />
                  <span className="text-xs text-zinc-400 w-8">{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Maintenance */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Maintenance</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Mode maintenance (bloque les nouvelles commandes)</span>
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm((f) => (f ? { ...f, maintenanceMode: e.target.checked } : f))}
              className="w-4 h-4 accent-primary-500"
            />
          </label>
          <div>
            <label className="text-sm text-zinc-600 dark:text-zinc-300 block mb-1">Message affiché au client</label>
            <input
              type="text"
              value={form.maintenanceMessage ?? ''}
              onChange={(e) => setForm((f) => (f ? { ...f, maintenanceMessage: e.target.value } : f))}
              placeholder="La plateforme est en maintenance…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/\(protected\)/parametres/page.tsx
git commit -m "feat(admin-web): add Paramètres page (platform settings form)"
```

---

## Task 8: Vérification finale

- [ ] **Step 1: Type-check complet**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur.

- [ ] **Step 2: Build**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run build`
Expected: `✓ Compiled successfully`. Les routes `/paiements`, `/livreurs`, `/zones`, `/parametres` apparaissent dans la liste des routes générées.

- [ ] **Step 3: Vérification manuelle (si le backend est déployé)**

Démarrer l'app (`pnpm --filter admin dev`, port 3001), se connecter en ADMIN :
- Le sidebar montre les 4 nouvelles entrées ; chaque page a son titre dans le header.
- **Paiements** : liste filtrable par statut, bouton « Confirmer » sur les paiements `PENDING` → toast de succès, le paiement disparaît du filtre PENDING.
- **Livreurs** : liste paginée avec compteur de livraisons.
- **Zones** : grille des quartiers.
- **Paramètres** : le formulaire affiche les valeurs courantes ; modifier puis « Enregistrer » → toast de succès. Vérifier qu'un rechargement conserve les valeurs.
- États loading / erreur / vide corrects sur chaque page.

Si le backend n'est pas déployé, noter cette étape comme à refaire après déploiement.

---

## Self-Review

**Couverture du périmètre (chantier 4, volet web) :**
- Page Paiements + action de confirmation → Tasks 2, 4 ✅
- Page Livreurs → Tasks 2, 5 ✅
- Page Zones (référentiel quartiers) → Tasks 2, 6 ✅
- Page Paramètres (formulaire `platform-settings`) → Tasks 2, 7 ✅
- Entrées sidebar + titres header → Task 3 ✅

**Cohérence des types :** `useAdminPayments` → `Paginated<AdminPayment>` (via `apiClientRaw`) ; `useAdminDeliverers` → `Paginated<AdminDeliverer>` ; `useQuartiers` → `Quartier[]` (via `apiClient`, `/quartiers` renvoie `{ data }`) ; `usePlatformSettings` → `PlatformSettings`. Les mutations `useConfirmPayment` et `useUpdatePlatformSettings` invalident / mettent à jour les caches concernés. Les noms de routes (`/paiements`, `/livreurs`, `/zones`, `/parametres`) sont identiques entre le sidebar (Task 3), le header (Task 3) et les dossiers de page (Tasks 4-7).

**Hors périmètre :** gestion CRUD des zones de livraison par restaurant (la page Zones est volontairement en lecture seule — pas d'endpoint admin global). Le volet Flutter du chantier 4 → plan distinct.

**Dépendance :** la vérification navigateur (Task 8 Step 3) suppose le backend LIL-79 + `platform-settings` déployé sur Render.
