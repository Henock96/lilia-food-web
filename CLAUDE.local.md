# CLAUDE.local.md — Lilia Web

Fichier de suivi des changements récents pour le site web client (`lilia_web`).

---

## Fonctionnalités ajoutées (Avril 2026)

### 1. Système de Favoris restaurants

**Types** (`packages/types/src/index.ts`):
- Ajout interface `Favorite { id, userId, restaurantId, restaurant?, createdAt }`
- `User.loyaltyPoints: number`, `User.referralCode?: string`
- Types `LoyaltyTransaction`, `ReferralStats`

**Hooks API** (`packages/api-client/src/hooks/favorites.ts`):
- `useFavorites(token)` — GET /favorites → `Restaurant[]`
- `useToggleFavorite(token)` — POST /favorites/:id ou DELETE /favorites/:id avec **optimistic update** (rollback sur erreur)

**Page Favoris** (`apps/web/app/(protected)/favoris/page.tsx`):
- Grille de restaurants favoris
- État vide avec icône Heart + lien vers /restaurants

**Header** (`apps/web/components/layout/header.tsx`):
- Lien "Favoris" ajouté dans `navLinks` → `/favoris`

---

### 2. Badges visuels sur RestaurantCard

**Fichier** (`apps/web/components/restaurants/restaurant-card.tsx`) — réécriture complète:

- **Bouton favori** (cœur) en haut à droite, rouge si favori
- **Badges bas-gauche** affichés en priorité sur les spécialités :
  - `Nouveau` (bleu) — `createdAt` < 7 jours
  - `⚡ Rapide` (orange) — `estimatedDeliveryTimeMax` ≤ 30 min
  - `🔥 Populaire` (rose) — présent dans `usePopularRestaurants()`
- Spécialités masquées quand des badges sont présents (évite le chevauchement)

**Hook populaire** (`packages/api-client/src/hooks/restaurants.ts`):
- `usePopularRestaurants()` — GET /restaurants/popular

---

### 3. Programme de Parrainage

**Page Profil** — carte "Parrainage" verte:
- Affiche le code parrain de l'utilisateur (tap = copier)
- Stats: total filleuls, filleuls récompensés
- Règles expliquées (+200 pts filleul, +500 pts parrain)

**Page Inscription** (`/inscription`):
- Champ optionnel "Code de parrainage" envoyé au sync backend

---

### 4. Points de Fidélité

**Page Profil** — carte "Points fidélité" orange:
- Solde + valeur en FCFA (1 pt = 5 FCFA)
- Toggle pour afficher l'historique des transactions

**Panier/Checkout**:
- Toggle amber "Utiliser mes points" (affiché si ≥ 100 pts)
- Ligne de réduction loyalty dans le récapitulatif
- Envoi de `useLoyaltyPoints: true` au checkout

---

### 5. Reorder 1-clic

- Bouton "Recommander" sur la liste des commandes (statut LIVRER ou ANNULER)
- Hook `useReorder` → POST /orders/:id/reorder → redirect vers /panier

---

### 6. Corrections diverses

- Frais de service: `8%` (était 10%)
- Mot de passe oublié sur `/connexion` (Firebase `sendPasswordResetEmail`)
- Paiements: MTN Mobile Money + Airtel Money (CASH_ON_DELIVERY supprimé)
- Page commande: affichage conditionnel livraison, "Gratuit" si FREE_DELIVERY

---

## Structure packages

```
packages/
├── api-client/src/hooks/
│   ├── favorites.ts      # useFavorites, useToggleFavorite
│   ├── restaurants.ts    # usePopularRestaurants (ajouté)
│   └── profile.ts        # useProfile, useReferralStats, useLoyaltyTransactions
├── types/src/index.ts    # Favorite, LoyaltyTransaction, ReferralStats
└── utils/
```

## Notes techniques

- **Optimistic updates**: `useToggleFavorite` met à jour le cache local immédiatement via `onMutate`, annule via `onError`. Utilise `queryClient.setQueryData` sur la clé `favoritesKeys.list`.
- **React Query deduplication**: `usePopularRestaurants()` dans chaque `RestaurantCard` — TanStack Query déduplique les requêtes identiques → 1 seul appel réseau.
- **`'use client'`**: tous les hooks et composants interactifs ont la directive `'use client'`.
- **Package manager**: utiliser `bun run` (pas npm/pnpm).
