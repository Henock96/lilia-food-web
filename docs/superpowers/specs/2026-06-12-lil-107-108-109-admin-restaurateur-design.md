# LIL-107 / 108 / 109 — Web admin scoped restaurateur

Suite de LIL-102 (multi-tenant RESTAURATEUR, même UX que le mobile admin).
Cible : `lilia-food-web/apps/admin` + `packages/api-client`. Aucun changement backend.

## Contraintes backend (vérifiées dans `lilia-backend`)

- **Bannières** : tout le CRUD est `@Roles('ADMIN')` → **reportées** (hors lot). Un
  restaurateur recevrait 403. Note à laisser sur LIL-108.
- **Catégories** : modèle **global** (`Category.nom @unique`, pas de `restaurantId`).
  `POST`/`PATCH` = `RESTAURATEUR, ADMIN` ; `DELETE` = `ADMIN` only.
  `GET /categories?restaurantId=` ne renvoie que les catégories ayant ≥1 produit
  dans ce resto (+ `_count.products`). On garde le modèle global (décision user).
- **Clients scoped** : `GET /restaurants/:id/clients` → `{ data, total, page, limit }`,
  champs basiques (`id, nom, email, phone, imageUrl, role, createdAt`).
  **Pas de `search`**, pas de `loyaltyPoints`/`orderCount`/`totalSpent`.
  `GET /restaurants/:id/clients/:userId/orders` → `{ data: Order[] (items.product) }`.
  Les deux : `@Roles('ADMIN','RESTAURATEUR')`.
- **Menus** : `POST /menus`, `GET /menus?restaurantId=`, `GET /menus/restaurant/mine`
  (`RESTAURATEUR,ADMIN`), `PATCH /menus/:id`, `PATCH /menus/:id/toggle`,
  `DELETE /menus/:id`. Champs : nom, description?, imageUrl?, prix, type
  (`COMBO|PLAT_SPECIAL`), ingredients?, dateDebut (ISO), dateFin (ISO), isActive?,
  products[] (`{productId, ordre?}`, requis COMBO).
- **Config resto** (`RESTAURATEUR,ADMIN`) :
  - `PATCH /restaurants/:id` (`UpdateRestaurantDto` : nom?, adresse?, phone?, imageUrl?,
    acceptsPreorders?, preorderLeadHours?, maxOrdersPerDay?). **Pas de `description`.**
  - `PATCH /restaurants/:id/delivery-settings` (fixedDeliveryFee?, estimatedDeliveryTimeMin?,
    estimatedDeliveryTimeMax?, minimumOrderAmount?, deliveryPriceMode? `FIXED|ZONE_BASED`).
  - `PUT /restaurants/:id/operating-hours` (`{ hours: [{dayOfWeek, openTime "HH:mm",
    closeTime "HH:mm", isClosed?}] }`), 7 jours `LUNDI..DIMANCHE`.
  - Pas d'endpoint dédié `manualOverride` → on réutilise le toggle ouvert/fermé existant
    (`useToggleRestaurantOpen`, déjà sur la grille `/restaurants`).

## LIL-107 — Clients scoped resto

- `hooks/admin-clients.ts` : `useRestaurantClients(token, restaurantId)` (fetch large
  via `apiClientRaw`, `enabled: !!restaurantId`), `useRestaurantClientOrders(restaurantId,
  clientId, token)`.
- `clients/page.tsx` : dispatch `useIsAdmin()`. ADMIN = vue actuelle inchangée.
  RESTAURATEUR = `RestaurantClientsView` : carte stat « N clients » (depuis `total`),
  liste scopée, **recherche + pagination côté front** (lot ~200), panneau détail
  calculant nb commandes / total dépensé / moyenne / dernière commande depuis les orders.
  Cas « aucun resto attribué » géré comme `restaurants/page.tsx`.
- Supprimer `clients/layout.tsx`. Sidebar : `Clients` → `adminOnly: false`.

## LIL-108 — Catégories + Menus (bannières reportées)

- `hooks/categories.ts` (nouveau) : `useCreateCategory`, `useUpdateCategory`,
  `useDeleteCategory` (invalide `['categories']`).
- `hooks/menus.ts` (nouveau) : `useMyMenus`, `useMenus`, `useCreateMenu`, `useUpdateMenu`,
  `useToggleMenu`, `useDeleteMenu`.
- `categories/page.tsx` (nouveau) : liste (resto-scopée restaurateur / globale admin) +
  `_count.products`, créer + renommer ; **delete visible ADMIN-only**. Sélecteur resto
  pour ADMIN (pattern `produits/`).
- `menus/page.tsx` (remplace le stub) : liste + panneau create/edit (COMBO = sélecteur
  produits ; PLAT_SPECIAL = ingrédients texte), toggle actif, delete, lien `/menus/[id]`.
- Sidebar : entrées `Catégories` + `Menus` (non adminOnly).

## LIL-109 — Mon Restaurant (config)

- `hooks/restaurants.ts` : `useUpdateRestaurant`, `useUpdateDeliverySettings`,
  `useSetOperatingHours` (invalident `['restaurants','mine']` + list + detail).
- `mon-restaurant/page.tsx` (nouveau) : sections **Général** / **Livraison** /
  **Horaires** (éditeur 7 jours). `useMyRestaurant` (restaurateur) + sélecteur resto
  (admin). Validation client + erreurs serveur via `toast`.
- Sidebar : `/restaurants` restaurateurLabel → « Ma vitrine » ; nouvelle entrée
  `/mon-restaurant` → « Mon Restaurant » (icône Settings), non adminOnly.

## Séquence de build

1. Hooks api-client (admin-clients, categories, menus, restaurants) + exports `index.ts`.
2. LIL-107 (page clients + suppression layout + sidebar).
3. LIL-108 (pages categories + menus + sidebar).
4. LIL-109 (page mon-restaurant + sidebar).
5. `pnpm type-check` + `pnpm lint` (admin + api-client). Un seul commit final.

## Hors périmètre

- Bannières restaurateur (backend ADMIN-only).
- `search` backend scoped clients ; `description` resto ; endpoint `manualOverride` dédié.
- Aucun renommage de symboles `restaurant*` (coordination cross-app).
