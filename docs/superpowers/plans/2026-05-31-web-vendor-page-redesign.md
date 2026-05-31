# Web Vendor Page Redesign + Reviews Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir la page `/restaurants/[id]` avec une section infos vendeur (bio, badge type, ancienneté, horaires) et un formulaire client pour laisser/modifier/supprimer un avis, gated `canReview`.

**Architecture:** Ajouter 3 DTOs dans `@lilia/types`, 5 hooks TanStack Query dans `@lilia/api-client`, 4 nouveaux composants React dans `apps/web/components/restaurants/`, et 2 intégrations légères (RestaurantReviews + page server component).

**Tech Stack:** Next.js (apps/web), TypeScript, Tailwind, @tanstack/react-query, framer-motion (existing), monorepo bun/turbo (`@lilia/types`, `@lilia/utils`, `@lilia/api-client`).

**Spec source:** `docs/superpowers/specs/2026-05-31-web-vendor-page-redesign-design.md`

---

## Pré-requis : branche Git

Crée la branche **avant** Task 1.

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git status   # working tree clean attendu
git branch --show-current   # → hmipoka/web-vendor-page-redesign (déjà créée pour le spec)
git log --oneline -3
```

Si la branche n'est pas active : `git checkout hmipoka/web-vendor-page-redesign`. Le HEAD doit contenir le commit `docs(spec): design web vendor page redesign + reviews submission (Chantier C)`.

⚠️ Cette branche descend de `hmipoka/web-client-preorder` (Chantier B). Ne PAS rebase, ne PAS merger `dev`.

---

## Phase A — Types + hooks api-client (foundation)

### Task A1: Ajouter les 3 interfaces de Review dans @lilia/types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Repérer l'interface Review existante**

Run :
```bash
grep -n "^export interface Review\b\|^export interface ReviewStats\b" packages/types/src/index.ts
```
Tu vois deux lignes : `Review` (~ligne 351) et `ReviewStats` (~ligne 363). Insère les 3 nouvelles interfaces **après** `ReviewStats` (avant `Banner`).

- [ ] **Step 2: Ajouter les 3 interfaces**

Repérer le bloc :
```typescript
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface Banner {
```

Le remplacer par :
```typescript
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface CreateReviewDto {
  rating: number; // 1..5
  comment?: string;
  restaurantId: string;
  /** ID de la commande liée (optionnel). Non utilisé côté web pour l'instant. */
  orderId?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface CanReviewResult {
  canReview: boolean;
  reason?: string;
  /** Présent si canReview=false parce que l'user a déjà un avis. */
  existingReviewId?: string;
}

export interface Banner {
```

- [ ] **Step 3: Build check**

Run :
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run build 2>&1 | tail -10
```
Expected : turbo build success. Si erreur TS → fix.

### Task A2: Ajouter les 5 hooks Review dans @lilia/api-client

**Files:**
- Modify: `packages/api-client/src/hooks/restaurants.ts`

- [ ] **Step 1: Repérer l'import des types et étendre**

Lire la ligne d'import en haut du fichier :
```typescript
import type { Restaurant, Review, ReviewStats, VendorType } from '@lilia/types';
```

La remplacer par :
```typescript
import type {
  Restaurant, Review, ReviewStats, VendorType,
  CreateReviewDto, UpdateReviewDto, CanReviewResult,
} from '@lilia/types';
```

- [ ] **Step 2: Ajouter la table de clés `reviewKeys` après `restaurantKeys`**

Repérer la fin du bloc `restaurantKeys` (autour des lignes 7-15, terminé par `}` puis ligne vide). Juste après cette table, insérer :

```typescript

export const reviewKeys = {
  canReview: (restaurantId: string) => ['reviews', 'can-review', restaurantId] as const,
  myReview: (restaurantId: string) => ['reviews', 'my-review', restaurantId] as const,
};
```

- [ ] **Step 3: Ajouter les 5 hooks à la fin du fichier**

Aller à la fin du fichier (après le dernier hook existant, typiquement `useToggleRestaurantOpen` ou similaire). Y ajouter :

```typescript

export function useCanReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.canReview(restaurantId),
    queryFn: () =>
      apiClient<CanReviewResult>(`/reviews/restaurant/${restaurantId}/can-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000,
  });
}

export function useMyReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.myReview(restaurantId),
    queryFn: () =>
      apiClient<Review | null>(`/reviews/restaurant/${restaurantId}/my-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000,
  });
}

export function useCreateReview(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReviewDto) =>
      apiClient<Review>('/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: (_review, dto) => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.canReview(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(dto.restaurantId) });
    },
  });
}

export function useUpdateReview(token: string | null, restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & UpdateReviewDto) =>
      apiClient<Review>(`/reviews/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}

export function useDeleteReview(token: string | null, restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ success: boolean }>(`/reviews/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.canReview(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}
```

- [ ] **Step 4: Re-export depuis l'index si nécessaire**

Run :
```bash
grep -n "useToggleRestaurantOpen\|useRestaurantReviewStats\|export \*" packages/api-client/src/index.ts | head -10
```

Si `packages/api-client/src/index.ts` re-export depuis `./hooks/restaurants` via `export *`, **rien à ajouter** — les nouveaux hooks sont déjà exportés. Si l'index re-exporte hook par hook (`export { useRestaurant, ... } from './hooks/restaurants';`), ajouter les 5 nouveaux à cette liste et `reviewKeys` :

```typescript
export {
  // ...existing
  reviewKeys,
  useCanReview,
  useMyReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from './hooks/restaurants';
```

- [ ] **Step 5: Build check**

Run :
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && rm -rf packages/api-client/dist && bun run build 2>&1 | tail -15
```
Expected : build success. Si erreur sur types (`CreateReviewDto` not found etc.), vérifier que `@lilia/types` est bien rebuild en premier — turbo le gère.

### Task A3: Commit Phase A

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add packages/types/src/index.ts packages/api-client/src/hooks/restaurants.ts packages/api-client/src/index.ts
git commit -m "$(cat <<'EOF'
feat(types,api-client): DTOs Review + 5 hooks (can-review, my-review, CRUD)

- CreateReviewDto, UpdateReviewDto, CanReviewResult dans @lilia/types
- reviewKeys (can-review, my-review)
- useCanReview, useMyReview (queries gated par token)
- useCreateReview, useUpdateReview, useDeleteReview (mutations + invalidations
  sur restaurantKeys.reviews/reviewStats + reviewKeys)

Foundation pour le formulaire client de notation (Chantier C).
Backend déjà en place côté lilia-backend (POST /reviews, PATCH, DELETE,
can-review, my-review).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

`packages/api-client/src/index.ts` n'est inclus dans `git add` que s'il a changé à Task A2 Step 4 — sinon git add l'ignore silencieusement.

---

## Phase B — VendorInfoSection + sous-composants

### Task B1: Créer ExpandableBio

**Files:**
- Create: `apps/web/components/restaurants/expandable-bio.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableBioProps {
  story: string;
  /** Au-dessus de ce nombre de caractères, on tronque + bouton "Lire plus". */
  collapseThreshold?: number;
}

const DEFAULT_THRESHOLD = 220;

export function ExpandableBio({ story, collapseThreshold = DEFAULT_THRESHOLD }: ExpandableBioProps) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = story.length > collapseThreshold;
  const displayed = !needsToggle || expanded
    ? story
    : story.slice(0, collapseThreshold).trimEnd() + '…';

  return (
    <div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
        {displayed}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
        >
          {expanded ? (
            <>Réduire <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Lire plus <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
```

### Task B2: Créer OperatingHoursList

**Files:**
- Create: `apps/web/components/restaurants/operating-hours-list.tsx`

- [ ] **Step 1: Vérifier le type DayOfWeek**

Run :
```bash
grep -n "^export type DayOfWeek\|^export interface OperatingHours" packages/types/src/index.ts
```
Confirme que `DayOfWeek` est un string union (typiquement `'MONDAY' | 'TUESDAY' | ...`). Lire la définition exacte si besoin pour les valeurs.

- [ ] **Step 2: Créer le fichier**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { OperatingHours, DayOfWeek } from '@lilia/types';

interface OperatingHoursListProps {
  hours: OperatingHours[];
}

// Ordre Lundi → Dimanche (la semaine française démarre lundi).
const DAY_ORDER: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche',
};

// JavaScript Date.getDay() : 0=Sunday, 1=Monday, ...
const JS_DAY_TO_ENUM: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

function currentDayOfWeek(): DayOfWeek {
  return JS_DAY_TO_ENUM[new Date().getDay()]!;
}

function renderHours(h: OperatingHours): string {
  if (h.isClosed) return 'Fermé';
  return `${h.openTime} — ${h.closeTime}`;
}

export function OperatingHoursList({ hours }: OperatingHoursListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || hours.length === 0) return null;

  const today = currentDayOfWeek();
  // Index par jour pour lookup O(1).
  const byDay = new Map<DayOfWeek, OperatingHours>();
  for (const h of hours) byDay.set(h.dayOfWeek, h);
  const todayHours = byDay.get(today);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="font-medium">
            {todayHours ? `Aujourd'hui : ${renderHours(todayHours)}` : "Horaires d'ouverture"}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex flex-col gap-1 overflow-hidden"
          >
            {DAY_ORDER.map((day) => {
              const h = byDay.get(day);
              const isToday = day === today;
              return (
                <li
                  key={day}
                  className={`flex justify-between text-sm ${
                    isToday
                      ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span>{DAY_LABEL[day]}</span>
                  <span>{h ? renderHours(h) : '—'}</span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Task B3: Créer VendorInfoSection

**Files:**
- Create: `apps/web/components/restaurants/vendor-info-section.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
import type { Restaurant } from '@lilia/types';
import { VendorTypeBadge, VENDOR_TYPE_LABELS } from './vendor-type-badge';
import { ExpandableBio } from './expandable-bio';
import { OperatingHoursList } from './operating-hours-list';

interface VendorInfoSectionProps {
  restaurant: Restaurant;
}

function formatSinceFr(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const formatted = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(d);
    // Capitalise première lettre du mois (Intl renvoie "mai 2025").
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return null;
  }
}

export function VendorInfoSection({ restaurant }: VendorInfoSectionProps) {
  const story = restaurant.vendorProfile?.story?.trim() || null;
  const hours = restaurant.operatingHours ?? [];
  const since = formatSinceFr(restaurant.createdAt);
  // Le badge est masqué pour RESTAURANT (composant gère son return null).
  const showBadge = !!restaurant.vendorType && restaurant.vendorType !== 'RESTAURANT';
  const vendorTypeLabel = restaurant.vendorType
    ? VENDOR_TYPE_LABELS[restaurant.vendorType]
    : null;

  // Rien à montrer ? On masque la section pour ne pas créer une card vide.
  if (!story && hours.length === 0 && !since && !showBadge) return null;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showBadge && restaurant.vendorType && (
          <VendorTypeBadge vendorType={restaurant.vendorType} />
        )}
        {since && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {vendorTypeLabel && !showBadge ? `${vendorTypeLabel} · ` : ''}
            Sur Lilia depuis {since}
          </span>
        )}
      </div>

      {story && (
        <div className="mb-4">
          <ExpandableBio story={story} />
        </div>
      )}

      {hours.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 dark:border-dark-border">
          <OperatingHoursList hours={hours} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && rm -rf apps/web/.next && bun run build 2>&1 | tail -15
```
Expected : build success. Si erreur sur `VENDOR_TYPE_LABELS` not exported, ajouter le re-export dans `vendor-type-badge.tsx` (devrait déjà être `export const`, vérifier).

### Task B4: Commit Phase B

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add apps/web/components/restaurants/expandable-bio.tsx \
        apps/web/components/restaurants/operating-hours-list.tsx \
        apps/web/components/restaurants/vendor-info-section.tsx
git commit -m "$(cat <<'EOF'
feat(restaurants): VendorInfoSection + ExpandableBio + OperatingHoursList

VendorInfoSection (server component) : badge VendorType + "Sur Lilia depuis
[mois année]" + bio vendeur + horaires d'ouverture. Section masquée si rien
à afficher.

ExpandableBio (client) : tronque au-delà de 220 caractères avec toggle
"Lire plus / Réduire".

OperatingHoursList (client) : ligne du jour actuel par défaut, déplie le
tableau 7 jours avec jour courant en gras. Format français Lundi → Dimanche.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — LeaveReviewForm

### Task C1: Créer LeaveReviewForm

**Files:**
- Create: `apps/web/components/restaurants/leave-review-form.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Star, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCanReview,
  useMyReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';

interface LeaveReviewFormProps {
  restaurantId: string;
}

const MAX_COMMENT = 1000;

export function LeaveReviewForm({ restaurantId }: LeaveReviewFormProps) {
  const { token } = useAuthStore();
  const canReviewQ = useCanReview(restaurantId, token);
  const myReviewQ = useMyReview(restaurantId, token);
  const createMut = useCreateReview(token);
  const updateMut = useUpdateReview(token, restaurantId);
  const deleteMut = useDeleteReview(token, restaurantId);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  // Modes possibles :
  // - sans token : ne rien rendre
  // - canReview true : Création
  // - canReview false + existingReviewId : Édition (pré-remplir avec myReview)
  // - canReview false sans existingReviewId : Désactivé (raison affichée)
  const canReview = canReviewQ.data?.canReview ?? false;
  const reason = canReviewQ.data?.reason ?? null;
  const existingReviewId = canReviewQ.data?.existingReviewId ?? null;
  const isEditing = !canReview && !!existingReviewId;
  const isDisabledByGate = !canReview && !existingReviewId;
  const existingReview = isEditing ? myReviewQ.data ?? null : null;

  // Synchroniser le formulaire quand on bascule en mode édition.
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment ?? '');
    }
  }, [existingReview]);

  if (!token) return null;
  if (canReviewQ.isLoading) {
    return (
      <div className="skeleton h-32 rounded-2xl mb-5" aria-hidden="true" />
    );
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error('Veuillez choisir au moins une étoile');
      return;
    }
    try {
      if (isEditing && existingReviewId) {
        await updateMut.mutateAsync({
          id: existingReviewId,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Avis mis à jour');
      } else {
        await createMut.mutateAsync({
          restaurantId,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Merci pour votre avis !');
        // Reset après création (canReview passera à false côté backend, donc
        // l'effect bascule en mode édition au prochain render).
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string; status?: number }).message;
      const status = (err as { status?: number }).status;
      if (status === 429) {
        toast.error('Vous publiez trop d\'avis, veuillez patienter');
      } else {
        toast.error(msg || 'Erreur lors de la publication');
      }
    }
  }

  async function handleDelete() {
    if (!existingReviewId) return;
    const ok = window.confirm('Supprimer définitivement votre avis ?');
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(existingReviewId);
      setRating(0);
      setComment('');
      toast.success('Avis supprimé');
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message;
      toast.error(msg || 'Suppression impossible');
    }
  }

  if (isDisabledByGate) {
    return (
      <div className="bg-zinc-50 dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl p-4 mb-5 flex items-start gap-3">
        <div className="rounded-full bg-zinc-200 dark:bg-zinc-700 p-2 shrink-0">
          <Lock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Laisser un avis
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {reason ?? 'Vous devez avoir commandé dans ce restaurant pour laisser un avis.'}
          </p>
        </div>
      </div>
    );
  }

  const submitting = createMut.isPending || updateMut.isPending;
  const deleting = deleteMut.isPending;

  return (
    <div className="bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isEditing ? 'Votre avis' : 'Laisser un avis'}
        </h4>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= (hoverRating || rating);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === rating}
              aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
              className="p-0.5"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  filled
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-zinc-300 dark:text-zinc-600 fill-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
        placeholder="Partagez votre expérience (optionnel)"
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 outline-none resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-zinc-400">
          {comment.length}/{MAX_COMMENT}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || rating < 1}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Envoi…' : isEditing ? 'Mettre à jour' : 'Publier'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && rm -rf apps/web/.next && bun run build 2>&1 | tail -15
```
Expected : build success. Si erreur sur l'import `@lilia/api-client` (hooks pas exportés), revenir à Task A2 Step 4 et ajouter les re-exports.

### Task C2: Commit Phase C

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add apps/web/components/restaurants/leave-review-form.tsx
git commit -m "$(cat <<'EOF'
feat(reviews): LeaveReviewForm client avec 4 états (création, édition, désactivé, hidden)

LeaveReviewForm gated par useCanReview (backend vérifie statut LIVRER) :
- token absent → composant invisible
- canReview true → mode Création (POST /reviews)
- canReview false + existingReviewId → mode Édition (PATCH + bouton Supprimer)
- canReview false sans review existante → carte désactivée avec raison

UI : 5 étoiles cliquables avec hover preview, textarea optionnel 1000 chars,
gestion erreur 429 (rate-limit anti-spam CRIT-7), confirm via window.confirm
pour la suppression. Toast sonner pour feedback.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Intégration page + RestaurantReviews

### Task D1: Insérer LeaveReviewForm dans RestaurantReviews

**Files:**
- Modify: `apps/web/components/restaurants/restaurant-reviews.tsx`

- [ ] **Step 1: Ajouter l'import**

Au top du fichier, après les imports existants :
```typescript
import { LeaveReviewForm } from './leave-review-form';
```

- [ ] **Step 2: Rendre le formulaire en haut de la card**

Le fichier a 2 branches de retour :
1. Cas "aucun avis" (lignes ~34-41 actuellement) — la card affiche "Aucun avis pour le moment."
2. Cas avec avis (lignes ~43-114) — card pleine.

Pour les **deux** branches, insérer le formulaire en haut de la card (avant le h3 "Avis clients"). Adapter les deux returns.

**Branche 1 (no reviews)** :
```tsx
return (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5">
    <LeaveReviewForm restaurantId={restaurantId} />
    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3">Avis clients</h3>
    <p className="text-sm text-zinc-400">Aucun avis pour le moment.</p>
  </div>
);
```

**Branche 2 (with reviews)** :
```tsx
return (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5">
    <LeaveReviewForm restaurantId={restaurantId} />
    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4">Avis clients</h3>
    {/* ...stats + liste existants inchangés... */}
  </div>
);
```

⚠️ Ne **rien d'autre changer** dans le fichier. Le formulaire est un client component, c'est OK comme enfant d'un server component async.

- [ ] **Step 3: Build check**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && rm -rf apps/web/.next && bun run build 2>&1 | tail -15
```
Expected : build success.

### Task D2: Insérer VendorInfoSection dans la page restaurant

**Files:**
- Modify: `apps/web/app/(public)/restaurants/[id]/page.tsx`

- [ ] **Step 1: Ajouter l'import**

Après l'import existant :
```typescript
import { RestaurantMenu } from '@/components/restaurants/restaurant-menu';
```

Ajouter :
```typescript
import { VendorInfoSection } from '@/components/restaurants/vendor-info-section';
```

- [ ] **Step 2: Rendre la section au-dessus du menu**

Dans le JSX retourné, repérer le bloc :
```tsx
<div className="lg:col-span-2">
  <Suspense
    fallback={...}
  >
    <RestaurantMenu restaurant={restaurant} />
  </Suspense>
</div>
```

Le remplacer par :
```tsx
<div className="lg:col-span-2">
  <VendorInfoSection restaurant={restaurant} />
  <Suspense
    fallback={
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    }
  >
    <RestaurantMenu restaurant={restaurant} />
  </Suspense>
</div>
```

(Le `fallback` reste inchangé — il est déjà dans le code, on le préserve. Si la structure exacte du fallback diffère, copier l'existant tel quel.)

- [ ] **Step 3: Build check**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && rm -rf apps/web/.next && bun run build 2>&1 | tail -20
```
Expected : build success, route `/restaurants/[id]` se rebuild sans erreur.

### Task D3: Commit Phase D

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add 'apps/web/app/(public)/restaurants/[id]/page.tsx' \
        apps/web/components/restaurants/restaurant-reviews.tsx
git commit -m "$(cat <<'EOF'
feat(restaurants): brancher VendorInfoSection sur la page + LeaveReviewForm

- /restaurants/[id] : VendorInfoSection insérée au-dessus du menu dans la
  colonne gauche (lg:col-span-2).
- RestaurantReviews : LeaveReviewForm en haut de la card, présent dans les
  deux branches (cas "aucun avis" + cas "avec avis").

Termine l'intégration UI du Chantier C.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase E — Vérification

### Task E1: Build full + sanity grep

- [ ] **Step 1: Full clean build**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
rm -rf apps/web/.next packages/types/dist packages/utils/dist packages/api-client/dist
bun run build 2>&1 | tail -25
```
Expected : turbo build success sur tous les packages + apps/web. Si erreur TS → fix avant de continuer.

- [ ] **Step 2: Sanity grep**

```bash
grep -n "useCanReview\|useMyReview\|useCreateReview\|useUpdateReview\|useDeleteReview" \
  packages/api-client/src/hooks/restaurants.ts \
  apps/web/components/restaurants/leave-review-form.tsx
```
Expected : 5 hooks définis dans `restaurants.ts`, tous les 5 importés/utilisés dans `leave-review-form.tsx`.

```bash
grep -n "VendorInfoSection\|LeaveReviewForm" \
  'apps/web/app/(public)/restaurants/[id]/page.tsx' \
  apps/web/components/restaurants/restaurant-reviews.tsx
```
Expected : `VendorInfoSection` référencée 2× dans `page.tsx` (import + JSX), `LeaveReviewForm` référencée 2× dans `restaurant-reviews.tsx` (import + 2 JSX usages).

### Task E2: Smoke test manuel (humain)

Non exécutable par un sub-agent. Documentation :

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run dev
```

Checklist sur `localhost:3000/restaurants/[id]` (choisir un resto avec `vendorProfile` rempli si possible) :

1. **VendorInfoSection** apparaît au-dessus du menu sur desktop. Sur mobile (one column), elle vient juste après le hero.
2. Resto avec `vendorProfile.story` court → texte affiché en entier, pas de bouton "Lire plus".
3. Resto avec story longue (> 220 chars) → texte tronqué + "Lire plus" → click → texte entier + "Réduire" → click → re-tronqué.
4. Resto avec `vendorType !== 'RESTAURANT'` → badge coloré visible. Resto RESTAURANT → pas de badge (composant return null).
5. Texte "Sur Lilia depuis [mois année]" affiché si `createdAt` valide.
6. **OperatingHoursList** collapsed par défaut : affiche "Aujourd'hui : 08:00 — 22:00" (ou "Fermé"). Click → 7 lignes Lundi à Dimanche, jour courant en gras.
7. **LeaveReviewForm anonyme** : section invisible sur la card avis.
8. Connecté CLIENT sans commande LIVRER chez ce resto → carte désactivée avec icône cadenas + raison backend.
9. Connecté CLIENT avec une commande LIVRER + sans avis → formulaire complet, étoiles cliquables avec hover preview, textarea avec compteur, bouton "Publier" disabled tant que rating = 0.
10. Submit OK → toast success "Merci pour votre avis !", liste des avis se rafraîchit (nouvelle entrée visible), stats se rafraîchissent (rating moyen mis à jour), formulaire passe en mode Édition.
11. Mode Édition : étoiles + textarea pré-remplies, bouton "Mettre à jour", bouton "Supprimer".
12. Click "Mettre à jour" après changement → toast "Avis mis à jour", liste/stats rafraîchies.
13. Click "Supprimer" → window.confirm → OK → toast "Avis supprimé", formulaire repasse en mode Création (ou Désactivé si la commande LIVRER a expiré côté backend, peu probable).
14. Vérifier DevTools Network : `POST /reviews` avec body `{ rating, comment?, restaurantId }`, `PATCH /reviews/:id` avec `{ rating, comment? }`, `DELETE /reviews/:id`, `GET /reviews/restaurant/:id/can-review`, `GET /reviews/restaurant/:id/my-review`.

### Task E3: Push branche

- [ ] **Step 1: Push**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git push -u origin hmipoka/web-vendor-page-redesign 2>&1 | tail -10
```
Expected : branche poussée, GitHub propose URL de PR.

### Task E4: PR

L'humain crée la PR via GitHub. Description suggérée :

```markdown
## Summary
- Chantier C : page vendeur enrichie + soumission d'avis client
- VendorInfoSection (badge type, ancienneté, bio, horaires) sous le hero
- LeaveReviewForm avec 4 états (création / édition / désactivé / hidden)
- 5 hooks `@lilia/api-client` : useCanReview, useMyReview, useCreateReview, useUpdateReview, useDeleteReview
- 3 DTOs `@lilia/types` : CreateReviewDto, UpdateReviewDto, CanReviewResult
- Zéro modif backend (endpoints déjà déployés)

## Test plan
- [x] Build clean (turbo + Next.js typecheck)
- [ ] Smoke test manuel checklist (voir docs/superpowers/plans/2026-05-31-web-vendor-page-redesign.md Phase E Task E2)
- [ ] DevTools Network : POST /reviews, PATCH, DELETE, can-review, my-review tous appelés correctement
```

---

## Récap commits attendus

| Phase | Commit |
|---|---|
| A3 | `feat(types,api-client): DTOs Review + 5 hooks (can-review, my-review, CRUD)` |
| B4 | `feat(restaurants): VendorInfoSection + ExpandableBio + OperatingHoursList` |
| C2 | `feat(reviews): LeaveReviewForm client avec 4 états (création, édition, désactivé, hidden)` |
| D3 | `feat(restaurants): brancher VendorInfoSection sur la page + LeaveReviewForm` |

4 commits, 1 branche, 1 PR.
