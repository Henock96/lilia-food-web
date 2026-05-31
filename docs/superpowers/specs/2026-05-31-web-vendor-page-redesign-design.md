# Design — Web vendor page redesign + reviews submission

**Date** : 2026-05-31
**Chantier** : C (troisième de 3 — A delivery sync livré, B preorder picker livré sur `hmipoka/web-client-preorder`)
**Auteur** : Henok Mipoka + Claude
**Status** : Approved → ready for implementation plan

## Contexte

La page `/restaurants/[id]` est minimaliste : `RestaurantHero` (nom, open/closed, spécialités, adresse, rating moyen, délais, frais livraison, min commande, bouton Appeler), `RestaurantMenu` (liste produits), `RestaurantReviews` (stats + liste avis read-only). Aucun moyen pour le client de laisser un avis depuis le web, alors que le backend l'expose depuis longtemps (mobile s'en sert).

Côté backend tout est en place (mai 2026, voir `lilia-backend/CLAUDE.local.md`) :
- `POST /reviews` (throttled CRIT-7 : 2/s, 5/min)
- `PATCH /reviews/:id`, `DELETE /reviews/:id`
- `GET /reviews/restaurant/:id/can-review` → `{ canReview: boolean; reason?: string; existingReviewId?: string }`
- `GET /reviews/restaurant/:id/my-review` → `Review | null`

Côté types front la base est déjà là :
- `Restaurant.vendorType?: VendorType` (`RESTAURANT | HOME_COOK | BAKERY | BEVERAGE_SHOP | GROCERY`)
- `Restaurant.createdAt: string` (utilisable pour "Sur Lilia depuis...")
- `Restaurant.operatingHours?: OperatingHours[]` (7 lignes max, `dayOfWeek + openTime + closeTime + isClosed`)
- `Restaurant.vendorProfile?: VendorProfile | null` (champ `story` ≈ bio, `certifications`, `specialties`, `productionNote`)

Il manque côté web :
- `CreateReviewDto`, `UpdateReviewDto`, `CanReviewResult` dans `@lilia/types`
- 5 hooks api-client : `useCanReview`, `useMyReview`, `useCreateReview`, `useUpdateReview`, `useDeleteReview`
- Une section "infos vendeur" (bio + badge type + ancienneté + horaires)
- Un formulaire de soumission d'avis gated `canReview`

## Objectif

Donner au client web une page vendeur plus riche (bio, type, ancienneté, horaires) et la possibilité de noter un vendeur depuis le web — gating "seulement clients ayant commandé" comme côté backend. Le mode édition/suppression d'un avis existant est inclus pour ne pas frustrer l'utilisateur qui veut corriger sa note.

## Non-objectifs

- Backend modifs : aucune (tout est en place)
- Galerie photos / plats populaires (reporté — pas d'endpoint dédié aujourd'hui, et la galerie demanderait Cloudinary upload côté front, hors scope)
- Modération admin des avis : déjà géré côté backend (`/reviews/:id` DELETE par ADMIN), pas de UI client
- Tests E2E : pas de Playwright sur le projet
- Mobile parity : l'app mobile a son propre flux ; le web aligne le wording mais pas le layout

## Décisions UX (validées par le user)

1. **Infos vendeur ajoutées** : bio (`vendorProfile.story`), badge type vendeur (composant `vendor-type-badge.tsx` réutilisé), ancienneté sur la plateforme ("Sur Lilia depuis [mois année]" à partir de `createdAt`), horaires d'ouverture par jour de la semaine. Pas de galerie photos.
2. **Auteur d'avis** : seulement les clients ayant commandé chez ce vendeur (statut `LIVRER`). Gating côté backend déjà existant, on lit `can-review`.
3. **Avis déjà laissé** : on permet la modification et la suppression. Le formulaire bascule en mode édition si `canReview: false` avec `existingReviewId` présent.
4. **Avis non autorisé** : pas masqué, on affiche un état désactivé avec le message backend ("Vous devez avoir commandé dans ce restaurant") pour éviter la confusion "ce vendeur n'a pas d'avis".
5. **Horaires** : section déployable (collapsed par défaut sur mobile, expanded sur desktop). Tableau 7 jours avec ligne "Fermé" si `isClosed === true`.
6. **Layout** : section "infos vendeur" en haut de la colonne menu (`lg:col-span-2`), au-dessus du `RestaurantMenu`. Le formulaire d'avis va dans la card `RestaurantReviews` (colonne droite `lg:col-span-1`).

## Architecture

### File structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `packages/types/src/index.ts` | Modify | Ajouter `CreateReviewDto`, `UpdateReviewDto`, `CanReviewResult` |
| `packages/api-client/src/hooks/restaurants.ts` | Modify | 5 hooks : `useCanReview`, `useMyReview`, `useCreateReview`, `useUpdateReview`, `useDeleteReview` |
| `apps/web/components/restaurants/vendor-info-section.tsx` | **New** | Bio + badge type + ancienneté + horaires (composant pur, props `restaurant`) |
| `apps/web/components/restaurants/operating-hours-list.tsx` | **New** | Sous-composant tableau 7 jours (extrait pour clarté + réutilisabilité éventuelle) |
| `apps/web/components/restaurants/leave-review-form.tsx` | **New** | Formulaire client avec mutations create/update/delete + gating `canReview` |
| `apps/web/components/restaurants/restaurant-reviews.tsx` | Modify | Insérer `<LeaveReviewForm restaurantId={...} />` en haut de la card |
| `apps/web/app/(public)/restaurants/[id]/page.tsx` | Modify | Insérer `<VendorInfoSection restaurant={restaurant} />` au-dessus de `<RestaurantMenu />` |

**Pattern** : on garde le pattern existant (composants client pour interactions, server components pour data initiale). `VendorInfoSection` peut être server (props purement Restaurant). `LeaveReviewForm` est client (mutations, état formulaire). `OperatingHoursList` est server (pure presentation).

### Type changes

```typescript
// packages/types/src/index.ts (ajout après l'interface Review existante)

export interface CreateReviewDto {
  rating: number;       // 1..5
  comment?: string;
  restaurantId: string;
  orderId?: string;     // pas utilisé côté web pour l'instant, mais conforme au DTO backend
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface CanReviewResult {
  canReview: boolean;
  reason?: string;
  existingReviewId?: string;
}
```

### Hooks api-client

```typescript
// packages/api-client/src/hooks/restaurants.ts (ajouts)

import type {
  Review, ReviewStats,
  CreateReviewDto, UpdateReviewDto, CanReviewResult,
} from '@lilia/types';

export const reviewKeys = {
  canReview: (restaurantId: string) => ['reviews', 'can-review', restaurantId] as const,
  myReview: (restaurantId: string) => ['reviews', 'my-review', restaurantId] as const,
};

export function useCanReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.canReview(restaurantId),
    queryFn: () => apiClient<CanReviewResult>(`/reviews/restaurant/${restaurantId}/can-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000, // 1 min — ne bourrine pas l'endpoint
  });
}

export function useMyReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.myReview(restaurantId),
    queryFn: () => apiClient<Review | null>(`/reviews/restaurant/${restaurantId}/my-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000,
  });
}

export function useCreateReview(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReviewDto) =>
      apiClient<Review>('/reviews', { method: 'POST', token, body: JSON.stringify(dto) }),
    onSuccess: (_review, dto) => {
      qc.invalidateQueries({ queryKey: restaurantKeys.reviews(dto.restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys.reviewStats(dto.restaurantId) });
      qc.invalidateQueries({ queryKey: reviewKeys.canReview(dto.restaurantId) });
      qc.invalidateQueries({ queryKey: reviewKeys.myReview(dto.restaurantId) });
    },
  });
}

export function useUpdateReview(token: string | null, restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & UpdateReviewDto) =>
      apiClient<Review>(`/reviews/${id}`, { method: 'PATCH', token, body: JSON.stringify(patch) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      qc.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}

export function useDeleteReview(token: string | null, restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ success: boolean }>(`/reviews/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      qc.invalidateQueries({ queryKey: reviewKeys.canReview(restaurantId) });
      qc.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}
```

`restaurantKeys.reviewStats(id)` et `restaurantKeys.reviews(id)` existent déjà dans `restaurants.ts` (vérifié) et sont consommés par `useRestaurantReviewStats` et `useRestaurantReviews`. On les réutilise tels quels pour les invalidations. `reviewKeys` est une nouvelle table dédiée au gating et à `my-review`.

### VendorInfoSection

Composant server (pas d'état, props seules). Layout :
- Header : nom (déjà dans hero, ne pas dupliquer — `VendorInfoSection` montre seulement ce qui n'est pas déjà dans hero)
- Row 1 : `<VendorTypeBadge type={restaurant.vendorType} />` + texte "Sur Lilia depuis [mois année]" (format `Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })`)
- Row 2 : Si `vendorProfile?.story` → card bio (background blanc/dark-card, padding, italic ou regular). Si la story dépasse ~200 caractères, ajouter un toggle "Lire plus" / "Lire moins" (état client local — donc on doit transformer le composant en client OU déléguer à un sous-composant client).
- Row 3 : Section horaires (toggle pour déplier)

Décision : `VendorInfoSection` reste **server**, le toggle "Lire plus" est un sous-composant client `<ExpandableBio story={...} />`. Le toggle horaires aussi (sinon SSR rendrait l'état "ouvert" toujours). Section horaires = composant client `<OperatingHoursList hours={...} />` qui gère son `open` state.

### LeaveReviewForm

Composant client. États possibles :

| `canReview.canReview` | `myReview` | Mode | UI |
|---|---|---|---|
| `true` | `null` | **Création** | Étoiles cliquables + textarea + "Publier" |
| `false` + `existingReviewId` | présent | **Édition** | Étoiles pré-remplies + textarea pré-remplie + "Mettre à jour" + bouton ghost "Supprimer" |
| `false` sans `existingReviewId` | null | **Désactivé** | Card grisée avec icône + message `canReview.reason` |
| `useCanReview.isLoading` | — | **Skeleton** | placeholder |
| pas de token | — | **Hidden** | Pas de section du tout (anonyme ne voit rien) |

Note d'implémentation : on appelle `useMyReview` uniquement si `canReview === false && existingReviewId` pour économiser une requête. En pratique on peut juste se baser sur `existingReviewId` du `canReview` pour le mode édition et fetcher la review une seule fois quand l'utilisateur clique sur "Modifier".

Validation locale :
- Rating obligatoire (au moins 1 étoile cliquée)
- Comment optionnel, max 1000 chars (limite pragmatique côté UI, pas backend)
- Bouton désactivé si rating = 0

Erreurs :
- Toast `error.message` du backend pour les 400/429/etc.
- Rate-limit (CRIT-7 : 2/s, 5/min) → toast "Vous publiez trop d'avis, veuillez patienter"

Optimistic update : on laisse TanStack Query revalider (les invalidations sur succès). Pas d'optimistic update sur la liste pour éviter les races et la complexité.

### OperatingHoursList

Composant client (pour le toggle expand/collapse). Props : `hours: OperatingHours[]`. Logique :
- Détecter le jour actuel (`Date().getDay()` ajusté → DayOfWeek)
- En collapsed : montre uniquement la ligne du jour actuel + flèche toggle
- En expanded : montre les 7 jours, le jour actuel en gras
- Si `isClosed === true` → "Fermé" en gris
- Format heures : "08:30 — 22:00" (em-dash, comme la convention française)

Ordre des jours : Lundi → Dimanche.

### Layout page

Dans `apps/web/app/(public)/restaurants/[id]/page.tsx`, ajouter `<VendorInfoSection />` après le hero, avant le `<RestaurantMenu />` dans la grille. La section vit dans la colonne menu (`lg:col-span-2`) pour la lisibilité.

Pour le `RestaurantReviews` (colonne droite), insérer `<LeaveReviewForm />` en haut. Comme `RestaurantReviews` est un server component qui fetch en parallèle (stats + reviews), on garde cette logique et on inclut le `<LeaveReviewForm restaurantId={restaurantId} />` en haut de son JSX (composant client donc OK comme child d'un server component).

## Edge cases & risques

- **`vendorProfile` est null** : la plupart des restaurants legacy n'ont pas de profile (Sprint LIL-110+ a ajouté ce champ). `VendorInfoSection` n'affiche pas la bio dans ce cas. Pas de placeholder type "Le vendeur n'a pas encore rédigé sa bio" — silent skip.
- **`vendorType` est `undefined`** : pareil pour les restaurants pré-marketplace. `VendorTypeBadge` doit gracieusement gérer ça (composant existant déjà — à vérifier sinon ajouter un return null).
- **`operatingHours` est vide ou contient 0 jours ouverts** : `OperatingHoursList` n'affiche rien si la liste est vide. Le hero a déjà le badge "Ouvert/Fermé" — pas de duplication.
- **`createdAt` futur ou invalide** : protection avec try/catch côté formatage, sinon fallback à ne pas afficher la ligne ancienneté.
- **Token expire pendant que le formulaire est ouvert** : la mutation échouera 401, toast affiche le message. Pas de re-auth automatique.
- **L'utilisateur a déjà laissé un avis et navigate vers un autre resto** : `useCanReview` est keyed par `restaurantId`, donc cache cohérent.
- **Concurrent updates** (deux onglets) : le second sera 409 ou 200 selon backend, on revalide les queries dans tous les cas.
- **Suppression d'avis** : confirmer via `window.confirm` (pragmatique, pas de modal custom — convention déjà utilisée ailleurs dans le projet à vérifier ; si non, ajouter un mini AlertDialog basé sur le pattern `CartModeConflictDialog`).
- **Throttle CRIT-7** : la création d'avis a un rate-limit (2/s, 5/min). En pratique un user ne publiera qu'un seul avis donc impact nul ; le message d'erreur backend est traduit en toast clair.

## Plan de vérification manuelle

Pas de tests auto. Checklist sur device :

1. `bun run dev` → `/restaurants/[id]` chargé
2. **VendorInfoSection** :
   - Resto sans `vendorProfile` → pas de bio (silent)
   - Resto avec `vendorProfile.story` court → affiché en intégralité
   - Resto avec story longue → bouton "Lire plus" déplie
   - Badge type vendeur visible sauf si `vendorType` est null
   - Texte "Sur Lilia depuis [mois année]" correct
3. **OperatingHoursList** :
   - Collapsed → ligne du jour actuel visible
   - Click → 7 jours visibles, jour actuel en gras
   - Jour avec `isClosed: true` → "Fermé"
4. **LeaveReviewForm — état Création** (user connecté qui a une commande LIVRER chez ce vendeur, pas d'avis encore) :
   - Étoiles cliquables (hover preview)
   - Textarea optionnel
   - "Publier" disabled tant que rating = 0
   - Submit → toast success, formulaire passe en mode Édition, liste avis rafraîchie, stats rafraîchies
5. **LeaveReviewForm — état Édition** (user a déjà un avis) :
   - Formulaire pré-rempli avec rating + comment existants
   - "Mettre à jour" → toast success, liste rafraîchie
   - "Supprimer" → confirm dialog → toast success, formulaire repasse en Création (si user a toujours une commande livrée) ou en Désactivé
6. **LeaveReviewForm — état Désactivé** (user connecté sans commande LIVRER) :
   - Card grisée avec message "Vous devez avoir commandé dans ce restaurant"
   - Pas d'étoiles cliquables
7. **LeaveReviewForm — anonyme** :
   - Section invisible
8. **Rate-limit** :
   - Spam create → toast "trop d'avis"

## Inventaire des changements

| Layer | Fichier | Type |
|---|---|---|
| Types | `packages/types/src/index.ts` | Modify (+3 interfaces, ~15 lignes) |
| API client | `packages/api-client/src/hooks/restaurants.ts` | Modify (+5 hooks + reviewKeys, ~80 lignes) |
| Components | `apps/web/components/restaurants/vendor-info-section.tsx` | **New** (≈80 lignes) |
| Components | `apps/web/components/restaurants/operating-hours-list.tsx` | **New** (≈70 lignes) |
| Components | `apps/web/components/restaurants/expandable-bio.tsx` | **New** (≈35 lignes — sous-composant) |
| Components | `apps/web/components/restaurants/leave-review-form.tsx` | **New** (≈180 lignes) |
| Components | `apps/web/components/restaurants/restaurant-reviews.tsx` | Modify (1 import + 1 JSX) |
| Page | `apps/web/app/(public)/restaurants/[id]/page.tsx` | Modify (1 import + 1 JSX) |

## Branches Git

- `lilia-food-web` : `hmipoka/web-vendor-page-redesign`, branchée depuis **`hmipoka/web-client-preorder`** (Chantier B). Permet de PR Chantier B et Chantier C indépendamment. Lineage préservée : marketplace (LIL-119) + admin preorder (LIL-123) + client preorder picker (Chantier B) → vendor redesign + reviews submission.
- Pas de modif backend (tout est déjà déployé).

## Cohérence cross-app

| Comportement | Mobile (lilia-app) | Web (ce chantier) |
|---|---|---|
| Gating create review | `can-review` endpoint | Identique |
| Modification d'avis | PATCH `/reviews/:id` | Identique |
| Suppression d'avis | DELETE `/reviews/:id` + confirm | Identique (confirm = `window.confirm` web) |
| Affichage bio | `vendorProfile.story` | Identique |
| Affichage horaires | `operatingHours` triée Lundi-Dimanche | Identique |
| Badge type vendeur | composant Flutter | composant React (`VendorTypeBadge` existant) |
| Format ancienneté | "Sur Lilia depuis [mois année]" | Identique |
