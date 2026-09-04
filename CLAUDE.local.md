# CLAUDE.local.md — Lilia Web

Fichier de suivi des changements récents pour le site web client (`lilia_web`).
Monorepo Turbo/pnpm : `apps/web` (client), `apps/admin`, `packages/*`
(`api-client`, `types`, `utils`).

---

## Le back-office catalogue lisait la route client (4 septembre 2026)

Deux symptômes signalés : « créer un produit renvoie une erreur » et « le
restaurant ne voit pas ses produits sur le site ». Même racine côté web : **une
erreur d'API rendue indiscernable d'une liste vide.**

```
useAdminVendors({ limit: 100 })  → 400 (le serveur plafonnait à 50)
  → `data?.data ?? []`           → vendors = []
  → sélecteur de vendeur masqué  → targetRestaurantId = undefined
  → POST /products sans restaurantId → 403 « Vous devez posséder un vendeur »
  → toast « Erreur lors de la création »
```

`useProducts` demandait `limit=200` (plafond serveur : 100) : **400 sur chaque
vendeur**, traduit en « Aucun produit. Commencez par en créer un. » La page
produits, l'étape catalogue de l'onboarding et le composeur de menus étaient
vides quoi qu'il y ait en base.

### Ce qui change

- **`MAX_PAGE_SIZE` exporté par `@lilia/api-client`.** La borne était devinée,
  différemment, à chaque appel. ⚠️ Demander plus n'est jamais la réponse à « il
  me manque des éléments » : c'est un plafond, pas un objectif — on pagine.
- **`useProducts` vise `GET /products/manage`**, authentifié, et enchaîne les
  pages jusqu'au total serveur (plafond de 50 pages). La route publique masque
  précisément ce qu'un gestionnaire doit voir : produits retirés de la vente,
  hors fenêtre horaire, et tout le catalogue d'un vendeur suspendu ou en `DRAFT`
  — c'est-à-dire celui qu'on est en train de remplir.
- **`ownerCatalogQueryOptions`** extrait du hook : l'URL fautive vivait dans une
  closure de `useQuery`, donc hors de portée de tout test. `products.contract.test.ts`
  appelle `queryFn` directement (vitest ajouté à `packages/api-client`).
- **`scope.vendorsError`** + bandeau d'erreur sur `/produits` : un échec de
  chargement ne rend plus le même écran qu'un catalogue vide.
- **`lib/api-message.ts`** : les toasts affichent le message du serveur. Le
  backend écrit des messages faits pour être lus (« Cette catégorie appartient à
  un autre vendeur ») ; les remplacer par « Erreur lors de la création » jetait
  la seule information exploitable de la réponse.
- **Bouton « retirer / remettre en vente »** (`PATCH /products/:id/availability`).
  La route existait depuis août et **aucun client ne l'appelait** : `isAvailable`
  n'était modifiable par personne. Elle n'a de sens que sur la vue back-office —
  sur le catalogue public, le produit disparaît en même temps que son bouton.

---

## Paiement web + reversements admin (31 août 2026)

Le backend et les apps Flutter étaient passés à pawaPay le 31/08 ; le web était
resté au **mode MANUAL de mai 2026**. Il affichait « Envoyez le montant au
numéro `NEXT_PUBLIC_MTN_NUMBER` » — un numéro copié dans le front, donc périmé
sans que personne ne s'en aperçoive — et le détail d'une commande n'avait
**aucune** surface de paiement : un paiement échoué était un cul-de-sac.

### Client — une seule surface de paiement

`components/checkout/payment-panel.tsx`, monté sur `/commandes/[id]`. Le
checkout ouvre la tentative puis redirige ici, et cette page reprend la main sur
**tous** les chemins de retour : rechargement, retour depuis l'historique,
reprise après échec. Un écran de paiement dédié dupliquerait ces états et
finirait par en oublier un.

- `useOrderPayment(orderId)` — `GET /payments/by-order/:id` **retrouve** la
  tentative (c'est ce qui rend F5 inoffensif), puis `GET /payments/:id/status`
  la rafraîchit tant qu'elle est `PENDING`. Cadence 3 s la première minute,
  5 s ensuite, arrêt à 3 min — aligné sur `payment_status_controller.dart`.
- **Un arrêt d'interrogation n'est pas un échec** : le webhook et le cron
  trancheront. L'afficher comme raté inviterait à payer deux fois.
- Rappel USSD (`*105#` / `*555#`) après 20 s seulement : plus tôt, il suggère
  que la demande automatique ne marche pas.
- `usePaymentProviders()` (`GET /payments/providers`, public) donne le rail en
  service et grise un opérateur en panne sans déploiement.

⚠️ `NEXT_PUBLIC_MTN_NUMBER` / `_AIRTEL_NUMBER` **retirés** de
`.env.local.example` : le numéro et le montant du mode manuel viennent de la
réponse de `POST /payments`.

### Admin — la moitié « reversement » existait côté serveur, pas côté web

- `components/payments/order-financials-card.tsx` sur le détail d'une commande
  (ADMIN seulement) : les quatre flux séparés, et le bouton **« Payer le
  restaurant »**. Aucun montant n'est recalculé, l'éligibilité vient du serveur,
  et une modale récapitule bénéficiaire / net / numéro masqué avant tout
  virement. Le vendeur ne voit ni la commission retenue ni la marge.
- `/paiements/reversements` — file de suivi. On **ne déclenche pas** un virement
  depuis une liste : le geste vit sur la commande, avec son contexte.
- `/paiements` : provider, référence prestataire, motif d'échec et frais
  d'encaissement affichés. Surtout, **« Confirmer » / « Rejeter » ne sortent que
  sur les paiements `MANUAL`** — ailleurs, « Réconcilier ». Le serveur applique
  la même règle (409 `PAYMENT_NOT_MANUAL`).
- `ApiError` porte désormais le `code` métier, lu dans `error.code` (le filtre
  backend range tout sauf `message` sous `error`).

---

## Remédiation audit (août 2026 — `AUDIT_2026-08-01.md`)

1. **Uploads admin — preset unsigned supprimé** (E-5). `apps/admin` uploadait en
   direct vers Cloudinary avec un preset *unsigned* : `cloud_name` et
   `upload_preset` vivaient dans des `NEXT_PUBLIC_*`, donc lisibles dans le
   bundle JS — n'importe qui pouvait uploader sur le compte Cloudinary de Lilia.
   `lib/cloudinary-upload.ts` passe maintenant par **`POST /upload/image`**
   (backend authentifié, 5 Mo, `FileTypeValidator` jpeg/png/webp, dossier
   imposé) — ce que `apps/web` faisait déjà.
   - Signature : `uploadToCloudinary(file, token, folder?)` — le **token
     Firebase est désormais obligatoire**, `folder` ∈ `restaurants | products |
     menus | users | banners`. Appelants mis à jour :
     `photo-gallery-editor.tsx`, `product-image-buffer.tsx`.
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `_UPLOAD_PRESET` **retirés** de
     `apps/admin/.env.example`. Les identifiants Cloudinary ne vivent plus que
     dans l'env du backend.
   - ⚠️ **Reste à faire côté ops** : désactiver le preset unsigned dans la
     console Cloudinary — tant qu'il est actif, l'ancienne surface d'attaque
     existe même sans les variables.
2. **Dépendances** — `pnpm audit --prod` : 52 vulnérabilités (1 critique, 28
   hautes) → **0**. `pnpm update -r` (Next 16.2.4 → **16.2.12**) + `overrides`
   `postcss >= 8.5.18` et `sharp >= 0.35.0`. `type-check` / `lint` / `build` ✅.

---

## Marketplace multi-vendeurs (mai-juin 2026)

Lilia Food est passée d'une app de livraison de restaurants à une **marketplace
locale multi-vendeurs** : restaurants, cuisines maison, boulangeries,
pâtisseries, boissons. Un « restaurant » est désormais un **vendeur** typé par
`vendorType`.

- `VendorType` : `RESTAURANT` / `HOME_COOK` (cuisine maison) / `BAKERY`
  (boulangerie) / `BEVERAGE_SHOP` (boissons) / `GROCERY` (épicerie). `ProductType` :
  FOOD, BEVERAGE, PASTRY, GROCERY (`ALCOHOL` en DB mais jamais proposé — pas
  d'alcool au lancement).
- `apps/web/app/(public)/restaurants/page.tsx` : liste filtrable par type de
  vendeur ; `apps/web/app/(protected)/panier/page.tsx` gère les produits
  sur-commande (`madeToOrder`) — un panier = un seul mode (immédiat **ou** sur
  commande).
- Le catalogue n'expose que les vendeurs **approuvés + actifs** (filtrage backend).
- ⚠️ Beaucoup de symboles restent nommés `restaurant*` : ils désignent le
  vendeur générique. Ne pas renommer sans coordination cross-app (backend + 3
  apps Flutter).

---

## Sprint J2 — Cohérence API (juin 2026)

### `apiClient` explicite

`packages/api-client/src/client.ts` :
- `apiClient<T>(path, opts)` : unwrap explicite de `{ data: T }` (au lieu de l'ancien `json.data ?? json` silencieux). Si la réponse n'est PAS wrappée, log un `console.warn` en dev (`process.env.NODE_ENV !== 'production'`) pour pousser la migration.
- `apiClientRaw<T>(path, opts)` : escape hatch pour endpoints non-wrappés (passthrough du JSON tel quel).

Coordonné avec le backend `hmipoka/api-contract-v2` qui ajoute un `ApiResponseInterceptor` global wrapant TOUT en `{ data, message?, meta? }`. Voir `lilia-backend/docs/api/2026-06-02-J2-api-contract-v2.md`.

### Sanitization logs admin connexion

`apps/admin/app/(auth)/connexion/page.tsx` : 5 `console.log` retirés ou rewrappés sous `NODE_ENV !== 'production'` (Firebase UID, token, rôle ne fuient plus en prod).

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
- **Package manager**: `pnpm@9.15.0` (déclaré dans `package.json#packageManager`). Le `bun.lock` à la racine est résiduel — utiliser `pnpm` pour install / type-check / lint / build.
