# Design — Web client preorder picker

**Date** : 2026-05-31
**Chantier** : B (deuxième de 3 — voir aussi A delivery sync déjà livré, C redesign /restaurants/[id] à venir)
**Auteur** : Henok Mipoka + Claude
**Status** : Approved → ready for implementation plan

## Contexte

Le mobile (`lilia-app`) a déjà la feature preorder client end-to-end depuis LIL-122 : panier mode-aware, conflict dialog, date+heure picker au checkout, disclaimer remboursement, envoi `scheduledFor` au backend. Le web `lilia-food-web` n'a pas encore l'équivalent côté client — il a uniquement le LIL-123 admin preorder (badges sur la liste commandes restaurateur).

Côté types le terrain est préparé : `Product.madeToOrder`, `Order.isPreorder`, `Order.scheduledFor`, `Restaurant.preorderLeadHours` existent déjà sur le web. Le backend accepte `scheduledFor` dans `POST /orders/checkout` (shippé depuis LIL-122 backend).

Il manque côté web :
- `scheduledFor` dans le `CreateOrderDto` du front
- Logique panier mode-aware (isPreorderCart, hasPreorderConflict)
- UI conflict dialog à l'ajout d'un item incompatible
- Picker modal date+heure au checkout
- Disclaimer remboursement
- Bouton submit conditionnel

## Objectif

Donner à un client web qui passe une commande contenant un produit `madeToOrder` (typiquement pâtisserie ou plat HOME_COOK) la possibilité de programmer un créneau de retrait/livraison, comme sur mobile, avec UX adaptée au format desktop/web.

## Non-objectifs

- Backend modifs : aucune (le DTO accepte déjà `scheduledFor`)
- Mobile parity stricte : on diverge légèrement du mobile sur deux points (modal vs inline picker, lead time vendor-specific vs hardcoded — voir Décisions UX)
- Tests E2E : pas de Playwright config sur le projet aujourd'hui, on reste sur vérif manuelle

## Décisions UX (validées par le user)

1. **Picker dans une modal custom**, pas inline. Le checkout reste épuré quand le panier n'est pas preorder. Ajoute une friction (un clic) mais évite de polluer la page checkout pour la majorité des commandes (standard).
2. **Lead time lu depuis `restaurant.preorderLeadHours`** (fallback 24h). Le mobile reste sur 24h hardcoded — debt cross-app acceptée par le user, à harmoniser ultérieurement.
3. **Picker = inputs HTML natifs (`<input type="date">` + `<input type="time">`)** enveloppés dans la modal. Robuste, accessible, zéro dépendance.
4. **Conflict dialog** = même UX que mobile : "Vider et ajouter" / "Annuler" lorsque user mixe modes.

## Architecture

### File structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `packages/types/src/index.ts` | Modify | Ajouter `scheduledFor?: string \| null` au `CreateOrderDto` |
| `packages/utils/src/cart.ts` | **New** | Helpers `isPreorderCart(cart)` + `hasPreorderConflict(cart, product)` |
| `packages/utils/src/index.ts` | Modify | Re-export du nouveau module |
| `apps/web/components/cart/cart-mode-conflict-dialog.tsx` | **New** | Modal de conflit (motion + Tailwind, pattern existant du repo) |
| `apps/web/components/checkout/preorder-slot-picker.tsx` | **New** | Modal date+heure avec validation lead time |
| `apps/web/components/restaurants/restaurant-menu.tsx` | Modify | Wrapper l'appel `useAddToCart` avec check conflict |
| `apps/web/app/(protected)/panier/page.tsx` | Modify | Section preorder conditionnelle au checkout + envoi `scheduledFor` + disable submit |

Pattern de répartition : types/utils restent dans les packages partagés (réutilisables si une autre app du monorepo en a besoin), components feature-specific dans `apps/web/components/{cart,checkout}/`.

### Type changes

```typescript
// packages/types/src/index.ts
export interface CreateOrderDto {
  paymentMethod: PaymentMethod;
  adresseId?: string;
  isDelivery?: boolean;
  notes?: string;
  contactPhone?: string;
  promoCode?: string;
  useLoyaltyPoints?: boolean;
  /** ISO 8601 — date+heure de récupération/livraison pour les commandes preorder. */
  scheduledFor?: string | null;
}
```

### Cart helpers (utils)

```typescript
// packages/utils/src/cart.ts
import type { Cart, Product } from '@lilia/types';

export function isPreorderCart(cart: Cart | null | undefined): boolean {
  if (!cart?.items?.length) return false;
  return cart.items.some((it) => it.product?.madeToOrder === true);
}

export function hasPreorderConflict(
  cart: Cart | null | undefined,
  product: Pick<Product, 'madeToOrder'>,
): boolean {
  if (!cart?.items?.length) return false;
  const cartIsPreorder = isPreorderCart(cart);
  const productIsPreorder = product.madeToOrder === true;
  return cartIsPreorder !== productIsPreorder;
}
```

Les helpers retournent toujours `false` sur cart vide ou null — ajouter un premier item n'est jamais un conflit.

### Cart mode conflict dialog

Modal full-screen avec backdrop, framer-motion (déjà utilisé partout sur le projet), pattern identique aux autres modals web. Props :
- `open: boolean`
- `cartIsPreorder: boolean` — pour adapter le message ("votre panier contient des produits sur commande" vs standard)
- `incomingProductName: string`
- `onConfirm: () => void` — vide le panier (`useClearCart`) puis ajoute l'item
- `onCancel: () => void` — referme, panier intact

Triggers : depuis `restaurant-menu.tsx`, le handler `handleAddToCart` check `hasPreorderConflict` AVANT d'appeler `useAddToCart`. Si conflict → ouvre la dialog. La confirmation enchaîne `clearCart.mutateAsync()` puis `addToCart.mutateAsync({...})`.

### PreorderSlotPicker modal

Modal séparée (autre composant) avec :
- `open: boolean`
- `leadHours: number` — vient du vendeur via `restaurant.preorderLeadHours ?? 24`
- `currentValue: Date | null` — pré-remplit si user réouvre pour modifier
- `onSelect(date: Date)`
- `onCancel()`

Logique :
- Min sélectionnable = `now + leadHours * 3600s` (computed via `useMemo`)
- Max = `now + 7 jours`
- Validation au submit : si chosen date < min ou > max → erreur inline en rouge, modal reste ouverte
- `new Date(yyyy, mm-1, dd, hh, mn)` construit un Date local (timezone navigateur), `.toISOString()` convertit en UTC pour le backend

UI : header avec titre + lead hours mention, icône calendrier sur date, icône clock sur heure, footer Annuler / Valider. Style cohérent avec l'orange Lilia (`bg-orange-600` etc.).

### Checkout integration (panier/page.tsx)

5 modifs additives sur la page existante (677 lignes) :

1. **Imports** : `isPreorderCart` from utils, `useRestaurant` from api-client, `PreorderSlotPicker` from le nouveau component.
2. **State** : `scheduledFor: Date | null`, `pickerOpen: boolean`. Derivations : `cartIsPreorder`, `leadHours` (via `useRestaurant(cart.items[0]?.product?.restaurantId)` puis `.preorderLeadHours ?? 24`).
3. **Section preorder conditionnelle** (`{cartIsPreorder && ...}`) entre les sections existantes et le bouton submit. Contient :
   - Header "Date et heure de retrait" + badge "Requis"
   - Soit slot affiché (`formatScheduledForFr(scheduledFor)` + bouton "Modifier") soit bouton "Choisir un créneau" (border-dashed)
   - Disclaimer ambré "Le vendeur peut annuler jusqu'à J-1. Remboursement sous 48h."
4. **Submit handler** : guard en début (`if (cartIsPreorder && !scheduledFor) { toast.error(...); return; }`) + ajout `scheduledFor: scheduledFor?.toISOString()` au DTO
5. **Bouton submit** : ajout `(cartIsPreorder && !scheduledFor)` au calcul `disabled`
6. **Reset effect** : `useEffect` qui set `scheduledFor` à null quand `cartIsPreorder` redevient false (sécurité contre slot orphelin si user vide puis remet standard)

Helper local `formatScheduledForFr(d: Date): string` ajouté en bas du fichier (capitalise jour, mois en minuscules, format "Jeudi 30 mai à 14:30"). Si on en a besoin ailleurs plus tard, on le hoist dans `@lilia/utils`.

## Edge cases & risques

- **Cart multi-vendeur** : le backend enforce single-vendor par panier, donc `cart.items[0].product.restaurantId` est représentatif de tout le panier. Pas de risque de prendre le mauvais `preorderLeadHours`.
- **`useRestaurant(undefined)`** : à vérifier si le hook gère gracefully (probable `enabled: !!id` interne). Si pas, on passe `firstItemRestaurantId ?? ''` et on s'assure que le hook ne fetch pas sur string vide.
- **`vendorRestaurant` qui charge** : pendant le fetch initial, `leadHours` vaut 24 (fallback). Si vendeur exige plus, le picker se met à jour quand le fetch arrive — l'utilisateur aurait pu sélectionner un créneau trop tôt entretemps. Acceptable car : (a) backend revalide et rejette si trop tôt, (b) c'est un cas court (<1s sur la majorité des connexions).
- **Timezone du navigateur** : on stocke et envoie en ISO UTC. Si le user voyage et change de tz pendant le checkout, l'heure affichée correspond à la tz courante. Pas un vrai bug pour notre marché Brazzaville (UTC+1 stable).
- **Slot orphelin** : `useEffect` qui reset `scheduledFor` quand `cartIsPreorder` redevient false. Évite qu'on envoie un slot pour un panier devenu standard.
- **Conflict dialog re-render** : `cart` peut changer entre le check et le clic confirm. On re-check à `handleConfirmConflict` pour éviter une race (idempotent : si plus de conflit, on enchaîne juste l'addToCart).
- **Modal accessibility** : trap focus, ESC pour fermer, `aria-modal="true"`. À vérifier dans l'impl — pattern existant du repo si dispo, sinon basique mais propre.

## Plan de vérification manuelle

Pas de tests auto. Checklist sur device + DevTools :

1. `bun run dev` lance le serveur Next
2. Connecté en CLIENT, panier vide
3. **Pas de bloc preorder** sur le checkout d'un panier vide
4. Ajouter produit `madeToOrder` (ex : pâtisserie d'un HOME_COOK) → bloc preorder apparaît au checkout
5. **Picker modal** :
   - Clic "Choisir un créneau" → modal s'ouvre
   - Date min = aujourd'hui + `leadHours` (ex : 24h → demain, 48h → après-demain)
   - Saisir date trop tôt → erreur inline, modal reste ouverte
   - Saisir créneau valide → modal ferme, "Jeudi 30 mai à 14:30" affiché + bouton "Modifier"
6. **Submit** :
   - Bouton "Valider et payer" reste disabled tant que pas de créneau
   - Submit avec créneau → `POST /orders/checkout` contient `scheduledFor` ISO (DevTools Network)
7. **Conflict dialog** :
   - Panier preorder existant → tenter ajout produit standard → dialog apparaît
   - "Vider et ajouter" → panier vidé puis item ajouté, toast success
   - "Annuler" → panier intact
   - Inverse (panier standard + tentative ajout madeToOrder) → même dialog
8. **Reset** : panier preorder avec slot → vider le panier (Trash) → ajouter item standard → vérifier qu'il n'y a plus de bloc preorder et que `scheduledFor` est null

## Inventaire des changements

| Layer | Fichier | Type |
|---|---|---|
| Types | `packages/types/src/index.ts` | Modify (+1 ligne) |
| Utils | `packages/utils/src/cart.ts` | **New** (≈30 lignes) |
| Utils | `packages/utils/src/index.ts` | Modify (+1 re-export) |
| Cart UI | `apps/web/components/cart/cart-mode-conflict-dialog.tsx` | **New** (≈80 lignes) |
| Checkout UI | `apps/web/components/checkout/preorder-slot-picker.tsx` | **New** (≈170 lignes) |
| Feature | `apps/web/components/restaurants/restaurant-menu.tsx` | Modify (guard add-to-cart + render dialog) |
| Feature | `apps/web/app/(protected)/panier/page.tsx` | Modify (section preorder, submit guard, dto field) |

## Branches Git

- `lilia-food-web` : `hmipoka/web-client-preorder`, branchée depuis **`hmipoka/lil-123-admin-preorder`** (et non depuis `dev`). `dev` est en retard de plusieurs sprints (LIL-116, LIL-118, LIL-119, LIL-123) qui n'ont pas encore été mergés. Brancher depuis la dernière branche admin preorder garantit qu'on a tous les types marketplace + vendor types nécessaires.
- Pas de modif backend.

## Cohérence cross-app

| Comportement | Mobile (lilia-app, LIL-122) | Web (ce chantier) |
|---|---|---|
| Picker | Inline dans le checkout | Modal séparée |
| Lead time | Hardcoded 24h-7j | `restaurant.preorderLeadHours ?? 24` à 7j |
| Disclaimer | "Le vendeur peut annuler jusqu'à J-1. Remboursement sous 48h." | Identique |
| Conflict dialog | `cart_mode_conflict_dialog.dart` | `cart-mode-conflict-dialog.tsx` |
| Format date FR | "Jeudi 30 mai à 14:30" | Identique |
| Envoi DTO | `scheduledFor: scheduledFor?.toIso8601String()` | `scheduledFor: scheduledFor?.toISOString()` |

Divergence sur picker (modal vs inline) = choix UX produit, pas une dette.
Divergence sur lead time = dette à harmoniser : mobile devrait migrer vers vendor-specific dans une issue future.
