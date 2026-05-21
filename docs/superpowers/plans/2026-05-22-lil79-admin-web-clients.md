# LIL-79 Admin Web — Fidélité, parrainage & liste clients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre visibles dans le dashboard admin web les points de fidélité d'un client, son parrainage, et offrir une liste clients complète avec recherche.

**Architecture:** App Next.js 16 (`lilia-food-web/apps/admin`). Les données viennent des endpoints backend LIL-79 déjà livrés (`GET /admin/clients`, `/admin/clients/:id/loyalty`, `/admin/clients/:id/referral`, `/dashboard/clients/:id` enrichi). On ajoute des types partagés (`@lilia/types`), des hooks TanStack Query (`@lilia/api-client`), et on enrichit la page `clients/page.tsx`.

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, TypeScript strict, Tailwind v4. Pas de framework de test dans cette app → la vérification se fait par `tsc --noEmit` (type-check) + revue manuelle navigateur.

**Périmètre :** Chantiers 1, 2, 3 du ticket LIL-79 (volet web). Le chantier 4 (pages Paiements / Livreurs / Zones / Paramètres) fera l'objet d'un plan distinct — ce sont 4 pages indépendantes, et « Paramètres » nécessite d'abord de clarifier l'endpoint backend.

**Prérequis :** Les endpoints backend LIL-79 sont mergés sur `dev` (`lilia-backend`). Tant qu'ils ne sont pas déployés sur `https://lilia-backend.onrender.com`, la vérification navigateur des données réelles est impossible — le type-check et la revue de code restent valables.

---

## Contexte du code existant

- `apiClient<T>` (`packages/api-client/src/client.ts`) fait un `fetch` puis **retourne `json.data ?? json`** — il déballe l'enveloppe `{ data }`. Pour une réponse paginée `{ data, total, page, limit }` il ne renvoie que `data` et **perd `total/page/limit`**. → on ajoute `apiClientRaw` qui renvoie le JSON brut.
- Les hooks vivent dans `packages/api-client/src/hooks/*.ts`, sont ré-exportés par `packages/api-client/src/index.ts`. Convention : `'use client'`, objet `xxxKeys` pour les query keys, `enabled: !!token`.
- `packages/types/src/index.ts` contient déjà `LoyaltyTransaction`, `ReferralStats`, `User`, `Payment`.
- `apps/admin/app/(protected)/clients/page.tsx` : page actuelle. Affiche 3 cartes stats + un bloc « Meilleurs clients » (`useClientStats` → `/dashboard/clients`). Un `ClientDetailPanel` (drawer) s'ouvre au clic, alimenté par `useClientDetail` → `/dashboard/clients/:id`. La page définit localement les interfaces `ClientEntry`, `DetailData`, etc., et `STATUS_LABELS`.
- Règles métier : 1 point = 5 XAF. Classes Tailwind custom déjà utilisées : `dark:bg-dark-card`, `dark:border-dark-border`, `shadow-card`, `text-primary-500`, `bg-zinc-50 dark:bg-zinc-800`.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `packages/types/src/index.ts` | Types partagés | Modifier — ajouter 4 interfaces |
| `packages/api-client/src/client.ts` | Wrapper fetch | Modifier — ajouter `apiClientRaw` |
| `packages/api-client/src/hooks/admin-clients.ts` | Hooks admin clients | Créer |
| `packages/api-client/src/index.ts` | Barrel d'export | Modifier — exporter le nouveau hook |
| `apps/admin/app/(protected)/clients/page.tsx` | Page clients | Modifier — sections fidélité/parrainage + liste paginée |

---

## Task 1: Types partagés dans `@lilia/types`

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Ajouter les interfaces après `ReferralStats`**

Repérer l'interface `ReferralStats` (~ligne 62). Juste après son `}` de fermeture, ajouter :

```typescript
/** Réponse paginée générique du backend : { data, total, page, limit }. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Un client dans la liste admin paginée (GET /admin/clients). */
export interface AdminClientListItem {
  id: string;
  email: string | null;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  loyaltyPoints: number;
  _count: { orders: number };
}

/** Solde + historique de fidélité d'un client (GET /admin/clients/:id/loyalty). */
export interface AdminClientLoyalty {
  balance: number;
  transactions: LoyaltyTransaction[];
}

/** Stats de parrainage d'un client (GET /admin/clients/:id/referral). */
export interface AdminClientReferral {
  referralCode: string | null;
  referredByCode: string | null;
  totalReferrals: number;
  convertedReferrals: number;
  referralBonusEarned: number;
}
```

- [ ] **Step 2: Vérifier le type-check du package**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web && pnpm --filter @lilia/types run build 2>/dev/null || npx tsc --noEmit -p packages/types/tsconfig.json`
Expected: aucune erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add admin client loyalty, referral and paginated types"
```

---

## Task 2: `apiClientRaw` — fetch sans déballage de l'enveloppe

`apiClient` renvoie `json.data ?? json`, ce qui détruit `total/page/limit`. La liste clients paginée a besoin de l'enveloppe complète.

**Files:**
- Modify: `packages/api-client/src/client.ts`

- [ ] **Step 1: Ajouter `apiClientRaw` à la fin du fichier**

À la fin de `client.ts`, après la fonction `apiClient`, ajouter :

```typescript
/**
 * Variante de `apiClient` qui retourne le JSON **brut**, sans déballer
 * l'enveloppe `{ data }`. À utiliser pour les réponses paginées
 * `{ data, total, page, limit }` dont on doit garder les métadonnées.
 */
export async function apiClientRaw<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, (error as { message?: string }).message ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
```

- [ ] **Step 2: Exporter `apiClientRaw` depuis le barrel**

Dans `packages/api-client/src/index.ts`, remplacer la première ligne :

```typescript
export { apiClient, ApiError, API_URL } from './client';
```

par :

```typescript
export { apiClient, apiClientRaw, ApiError, API_URL } from './client';
```

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/client.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): add apiClientRaw to preserve pagination envelope"
```

---

## Task 3: Hooks admin clients

**Files:**
- Create: `packages/api-client/src/hooks/admin-clients.ts`
- Modify: `packages/api-client/src/index.ts`

- [ ] **Step 1: Créer `admin-clients.ts`**

```typescript
'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type {
  Paginated,
  AdminClientListItem,
  AdminClientLoyalty,
  AdminClientReferral,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminClientKeys = {
  all: ['admin', 'clients'] as const,
  list: (page: number, search: string) =>
    [...adminClientKeys.all, 'list', page, search] as const,
  loyalty: (clientId: string) =>
    [...adminClientKeys.all, clientId, 'loyalty'] as const,
  referral: (clientId: string) =>
    [...adminClientKeys.all, clientId, 'referral'] as const,
};

/** Liste clients paginée + recherche (GET /admin/clients). */
export function useAdminClients(
  token: string | null,
  page: number,
  search: string,
) {
  return useQuery({
    queryKey: adminClientKeys.list(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      return apiClientRaw<Paginated<AdminClientListItem>>(
        `/admin/clients?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Solde + historique de fidélité d'un client (GET /admin/clients/:id/loyalty). */
export function useClientLoyalty(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.loyalty(clientId ?? ''),
    queryFn: () =>
      apiClient<AdminClientLoyalty>(`/admin/clients/${clientId}/loyalty`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/** Stats de parrainage d'un client (GET /admin/clients/:id/referral). */
export function useClientReferral(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.referral(clientId ?? ''),
    queryFn: () =>
      apiClient<AdminClientReferral>(`/admin/clients/${clientId}/referral`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}
```

Note : `/admin/clients/:id/loyalty` renvoie `{ data: { balance, transactions }, total, page, limit }` ; `apiClient` déballe `data` → on récupère bien `{ balance, transactions }`. `/admin/clients/:id/referral` renvoie `{ data: {...} }` → `apiClient` déballe en `AdminClientReferral`. La liste, elle, a besoin de `apiClientRaw` pour garder `total`.

- [ ] **Step 2: Exporter le hook depuis le barrel**

Dans `packages/api-client/src/index.ts`, ajouter à la fin :

```typescript
export * from './hooks/admin-clients';
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web && npx tsc --noEmit -p packages/api-client/tsconfig.json 2>/dev/null || cd packages/api-client && npx tsc --noEmit`
Expected: aucune erreur. (`keepPreviousData` est exporté par `@tanstack/react-query` v5 — déjà une dépendance.)

- [ ] **Step 4: Commit**

```bash
git add packages/api-client/src/hooks/admin-clients.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): add useAdminClients, useClientLoyalty, useClientReferral hooks"
```

---

## Task 4: Section Fidélité dans `ClientDetailPanel`

**Files:**
- Modify: `apps/admin/app/(protected)/clients/page.tsx`

- [ ] **Step 1: Mettre à jour les imports**

En tête du fichier, la ligne d'import `@lilia/api-client` devient :

```typescript
import { useClientStats, useClientDetail, useClientLoyalty, useClientReferral, useAdminClients } from '@lilia/api-client';
```

Dans l'import `lucide-react`, ajouter `Star`, `Gift`, `Search`, `ChevronLeft` à la liste existante des icônes.

- [ ] **Step 2: Ajouter un helper de formatage de date relative**

Juste après la constante `STATUS_LABELS`, ajouter :

```typescript
function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
```

- [ ] **Step 3: Ajouter le composant `LoyaltySection`**

Avant la fonction `ClientDetailPanel`, ajouter ce composant :

```tsx
function LoyaltySection({ clientId, token }: { clientId: string; token: string | null }) {
  const { data, isLoading } = useClientLoyalty(clientId, token);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!data) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Fidélité</p>
      <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {data.balance.toLocaleString('fr-FR')}
          </span>
          <span className="text-sm text-zinc-500">points</span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          ≈ {(data.balance * 5).toLocaleString('fr-FR')} FCFA de réduction disponible
        </p>
      </div>
      {data.transactions.length === 0 ? (
        <p className="text-xs text-zinc-400">Aucune transaction de fidélité</p>
      ) : (
        <div className="space-y-1.5">
          {data.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="text-zinc-600 dark:text-zinc-300 truncate">{t.reason}</p>
                <p className="text-zinc-400">{formatTxnDate(t.createdAt)}</p>
              </div>
              <span className={`font-semibold tabular-nums shrink-0 ${
                t.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {t.points >= 0 ? '+' : ''}{t.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Monter `LoyaltySection` dans le panneau**

Dans `ClientDetailPanel`, dans le bloc rendu quand `detail` existe, juste après le bloc `{/* Last order */}` (la `div` avec l'icône `Clock`) et avant `{/* Addresses */}`, insérer :

```tsx
            {/* Fidélité */}
            <LoyaltySection clientId={clientId} token={token} />
```

- [ ] **Step 5: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur TypeScript.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/\(protected\)/clients/page.tsx
git commit -m "feat(admin-web): show loyalty balance and history in client detail"
```

---

## Task 5: Section Parrainage dans `ClientDetailPanel`

**Files:**
- Modify: `apps/admin/app/(protected)/clients/page.tsx`

- [ ] **Step 1: Ajouter le composant `ReferralSection`**

Juste après le composant `LoyaltySection`, ajouter :

```tsx
function ReferralSection({ clientId, token }: { clientId: string; token: string | null }) {
  const { data, isLoading } = useClientReferral(clientId, token);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!data) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Parrainage</p>
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift size={14} className="text-primary-500 shrink-0" />
          {data.referralCode ? (
            <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {data.referralCode}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Aucun code de parrainage</span>
          )}
        </div>
        {data.referredByCode && (
          <p className="text-xs text-zinc-500">
            Parrainé via le code <span className="font-mono text-zinc-700 dark:text-zinc-300">{data.referredByCode}</span>
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{data.totalReferrals}</p>
            <p className="text-xs text-zinc-400">Filleuls</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.convertedReferrals}</p>
            <p className="text-xs text-zinc-400">Convertis</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{data.referralBonusEarned}</p>
            <p className="text-xs text-zinc-400">Pts gagnés</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Monter `ReferralSection` dans le panneau**

Dans `ClientDetailPanel`, juste après la ligne `<LoyaltySection clientId={clientId} token={token} />` ajoutée à la Task 4, insérer :

```tsx
            {/* Parrainage */}
            <ReferralSection clientId={clientId} token={token} />
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur TypeScript.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/\(protected\)/clients/page.tsx
git commit -m "feat(admin-web): show referral stats in client detail"
```

---

## Task 6: Liste clients complète + recherche

La page n'affiche aujourd'hui que le « top clients ». On ajoute, sous ce bloc, une section « Tous les clients » : champ de recherche + liste paginée via `useAdminClients`.

**Files:**
- Modify: `apps/admin/app/(protected)/clients/page.tsx`

- [ ] **Step 1: Ajouter le composant `AllClientsSection`**

Avant la fonction `ClientsPage` (le composant exporté par défaut), ajouter :

```tsx
function AllClientsSection({
  token,
  onSelect,
}: {
  token: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  // Debounce de la recherche (350ms) + retour page 1 à chaque nouvelle recherche
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isPlaceholderData } = useAdminClients(token, page, debounced);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">Tous les clients</h3>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, email…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : !data?.data.length ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {debounced ? 'Aucun client ne correspond à cette recherche' : 'Aucun client'}
          </p>
        </div>
      ) : (
        <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.data.map((c) => {
            const name = c.nom || c.email || '—';
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="flex items-center gap-4 px-5 py-3 w-full text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt={name} width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-500">{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{c.nom || '—'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                        <Mail size={10} />{c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                        <Phone size={10} />{c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <Star size={10} className="text-amber-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {c.loyaltyPoints.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <ShoppingBag size={10} className="text-zinc-400" />
                    <span className="text-xs text-zinc-400">{c._count.orders} cmd</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
          <span className="text-xs text-zinc-400 tabular-nums">
            {data.total} client{data.total > 1 ? 's' : ''} · page {page}/{totalPages}
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
  );
}
```

- [ ] **Step 2: Mettre à jour les imports React**

En tête du fichier, la ligne `import { useState } from 'react';` devient :

```typescript
import { useState, useEffect } from 'react';
```

- [ ] **Step 3: Monter `AllClientsSection` dans `ClientsPage`**

Dans `ClientsPage`, juste avant le bloc `{/* Detail panel */}` (à la fin du `<div className="max-w-4xl space-y-6">`), insérer :

```tsx
      {/* Tous les clients */}
      <AllClientsSection token={token} onSelect={setSelectedClientId} />
```

- [ ] **Step 4: Type-check**

Run: `cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check`
Expected: aucune erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/\(protected\)/clients/page.tsx
git commit -m "feat(admin-web): add paginated searchable client list"
```

---

## Task 7: Vérification finale

- [ ] **Step 1: Type-check de tout le périmètre**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run type-check
```
Expected: aucune erreur.

- [ ] **Step 2: Build de l'app admin**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/admin && pnpm run build
```
Expected: build réussi (`✓ Compiled successfully`). Toute erreur doit concerner uniquement le code de ce plan.

- [ ] **Step 3: Vérification manuelle (si le backend LIL-79 est déployé)**

Démarrer l'app (`pnpm --filter admin dev`, port 3001), se connecter en ADMIN, aller sur `/clients` :
- La section « Tous les clients » liste les clients, la recherche filtre, la pagination fonctionne.
- Cliquer un client → le panneau de détail montre la carte « Fidélité » (solde + équivalent XAF + historique) et la carte « Parrainage » (code, filleuls, convertis, points gagnés).
- États `loading` (skeletons), vide et erreur corrects.

Si le backend LIL-79 n'est pas encore déployé, noter cette étape comme à refaire après déploiement.

---

## Self-Review

**Couverture du périmètre (chantiers 1-3, volet web) :**
- Chantier 1 (Fidélité) : `useClientLoyalty` + `LoyaltySection` (Tasks 3-4) ✅
- Chantier 2 (Parrainage) : `useClientReferral` + `ReferralSection` (Tasks 3, 5) ✅
- Chantier 3 (Liste clients) : `apiClientRaw` + `useAdminClients` + `AllClientsSection` avec recherche debouncée et pagination (Tasks 2-3, 6) ✅

**Hors périmètre (volontaire) :** Chantier 4 (pages Paiements / Livreurs / Zones / Paramètres) → plan distinct. « Paramètres » nécessite d'abord de clarifier l'endpoint backend (aucun endpoint « configuration plateforme » identifié).

**Cohérence des types :** `useAdminClients` → `Paginated<AdminClientListItem>` (via `apiClientRaw`, enveloppe conservée) ; `useClientLoyalty` → `AdminClientLoyalty` (`apiClient` déballe `data`) ; `useClientReferral` → `AdminClientReferral`. Les hooks `useClientLoyalty`/`useClientReferral` prennent `(clientId, token)` ; `useAdminClients` prend `(token, page, search)`. Noms de composants `LoyaltySection` / `ReferralSection` / `AllClientsSection` cohérents entre Task de définition et Task de montage.

**Dépendance :** ce plan suppose les endpoints backend LIL-79 livrés. Ils sont mergés sur `dev` (`lilia-backend`) ; un déploiement Render est nécessaire pour la vérification navigateur (Task 7 Step 3).
