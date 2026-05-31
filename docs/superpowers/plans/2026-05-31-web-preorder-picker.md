# Web Client Preorder Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au client web la possibilité de programmer un créneau de retrait/livraison pour les commandes contenant un produit `madeToOrder`, avec dialog de conflit panier et envoi `scheduledFor` au backend.

**Architecture:** Ajouter `scheduledFor` au `CreateOrderDto` (types partagés), exposer 2 helpers cart-mode dans `@lilia/utils` (single-file convention), créer 2 modals dédiés (`CartModeConflictDialog`, `PreorderSlotPicker`), brancher la dialog conflict dans `restaurant-menu.tsx` et la modal picker dans `panier/page.tsx`. Lead time vendor-specific via `restaurant.preorderLeadHours`.

**Tech Stack:** Next.js (apps/web), TypeScript, Tailwind, framer-motion, @tanstack/react-query, monorepo bun/turbo (`@lilia/types`, `@lilia/utils`, `@lilia/api-client`).

**Spec source:** `docs/superpowers/specs/2026-05-31-web-preorder-picker-design.md`

---

## Pré-requis : branche Git

Crée la branche **avant** Task 1.

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git status   # working tree clean attendu, sur hmipoka/lil-123-admin-preorder
git checkout -b hmipoka/web-client-preorder
git branch --show-current   # → hmipoka/web-client-preorder
```

⚠️ **NE PAS** brancher depuis `dev` — `dev` est en retard de plusieurs sprints (LIL-116, LIL-118, LIL-119, LIL-123). Brancher depuis `hmipoka/lil-123-admin-preorder` est ce qui donne la lineage marketplace complète.

Si un numéro Linear est attribué : `git branch -m hmipoka/lil-XXX-web-client-preorder`.

---

## Phase A — Types + utils (foundation partagée)

### Task A1: Ajouter scheduledFor à CreateOrderDto

**Files:**
- Modify: `packages/types/src/index.ts:515-523`

- [ ] **Step 1: Patcher l'interface CreateOrderDto**

Remplacer le bloc actuel (entre les commentaires `// --- DTOs ---` et `export interface CreateAdresseDto`) :
```typescript
// --- DTOs ---
export interface CreateOrderDto {
  paymentMethod: PaymentMethod;
  adresseId?: string;
  isDelivery?: boolean;
  notes?: string;
  contactPhone?: string;
  promoCode?: string;
  useLoyaltyPoints?: boolean;
}
```

Par :
```typescript
// --- DTOs ---
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

- [ ] **Step 2: Vérifier que ça compile**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run build 2>&1 | tail -15
```
Expected: build réussit (turbo build sur tous les packages). Si erreur TS, lire le message et fixer.

### Task A2: Ajouter helpers cart-mode dans @lilia/utils

**Files:**
- Modify: `packages/utils/src/index.ts` (ajout en fin de fichier)

**Convention** : le package utils est un single-file `index.ts`. On suit cette convention — pas de fichier `cart.ts` séparé.

- [ ] **Step 1: Ajouter l'import en haut du fichier**

Au début du fichier, après l'import existant `import type { OrderStatus, DayOfWeek } from '@lilia/types';`, modifier pour étendre :
```typescript
import type { OrderStatus, DayOfWeek, Cart, Product } from '@lilia/types';
```

- [ ] **Step 2: Ajouter les helpers à la fin du fichier**

Après la dernière fonction `isValidCongoPhone`, ajouter :
```typescript

/**
 * True si au moins un item du panier est madeToOrder (panier preorder).
 * Retourne false pour cart null/undefined/vide — ajouter un premier item
 * n'est jamais un conflit.
 */
export function isPreorderCart(cart: Cart | null | undefined): boolean {
  if (!cart?.items?.length) return false;
  return cart.items.some((it) => it.product?.madeToOrder === true);
}

/**
 * True si ajouter `product` au panier crée un conflit de mode :
 * - le panier a déjà des items madeToOrder et on ajoute un standard
 * - le panier a déjà des items standard et on ajoute un madeToOrder
 * Le backend accepte un panier mono-mode uniquement, donc on bloque
 * côté client avec une dialog "Vider et ajouter / Annuler".
 */
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

- [ ] **Step 3: Vérifier le build des packages**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run build 2>&1 | tail -10
```
Expected: success. Les packages `@lilia/types` puis `@lilia/utils` puis `@lilia/api-client` doivent rebuild dans l'ordre des dépendances (turbo gère).

### Task A3: Commit Phase A

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add packages/types/src/index.ts packages/utils/src/index.ts
git commit -m "$(cat <<'EOF'
feat(types,utils): scheduledFor sur CreateOrderDto + helpers cart preorder

- CreateOrderDto.scheduledFor (ISO 8601) pour envoi backend au checkout
- isPreorderCart(cart) : true si au moins un item est madeToOrder
- hasPreorderConflict(cart, product) : true si mixer mode preorder/standard

Foundation pour le picker checkout client web (LIL-122 equivalent côté web).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — Modals (composants UI réutilisables)

### Task B1: Créer CartModeConflictDialog

**Files:**
- Create: `apps/web/components/cart/cart-mode-conflict-dialog.tsx`

- [ ] **Step 1: Créer le dossier si absent**

```bash
mkdir -p /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/cart
ls /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/cart/
```

- [ ] **Step 2: Créer le fichier avec le contenu suivant**

```tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartModeConflictDialogProps {
  open: boolean;
  /** Le panier existant est preorder (true) ou standard (false). */
  cartIsPreorder: boolean;
  /** Nom du produit que l'utilisateur essaie d'ajouter — pour le message. */
  incomingProductName: string;
  /** Confirme : vide le panier puis ajoute le nouvel item. */
  onConfirm: () => void;
  /** Annule l'ajout, garde le panier intact. */
  onCancel: () => void;
}

export function CartModeConflictDialog({
  open,
  cartIsPreorder,
  incomingProductName,
  onConfirm,
  onCancel,
}: CartModeConflictDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-conflict-title"
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-orange-100 p-2 shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 id="cart-conflict-title" className="font-bold text-lg text-gray-900">
                  Mode de commande incompatible
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {cartIsPreorder
                    ? `Votre panier contient des produits sur commande. "${incomingProductName}" est un produit standard.`
                    : `Votre panier contient des produits standard. "${incomingProductName}" est un produit sur commande (date à programmer).`}
                  {' '}Un panier ne peut pas mélanger les deux modes.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700"
              >
                Vider et ajouter
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Lint check sur le fichier**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web && bun run lint 2>&1 | tail -10
```
Expected: no errors on this file. Les warnings préexistants OK.

### Task B2: Créer PreorderSlotPicker

**Files:**
- Create: `apps/web/components/checkout/preorder-slot-picker.tsx`

- [ ] **Step 1: Créer le dossier si absent**

```bash
mkdir -p /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/checkout
ls /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/checkout/
```

- [ ] **Step 2: Créer le fichier avec le contenu suivant**

```tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X } from 'lucide-react';

interface PreorderSlotPickerProps {
  open: boolean;
  /** Heures de préavis requises par le vendeur. Par défaut 24h. */
  leadHours: number;
  /** Valeur actuelle si déjà choisie, pour pré-remplir. */
  currentValue: Date | null;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}

export function PreorderSlotPicker({
  open,
  leadHours,
  currentValue,
  onSelect,
  onCancel,
}: PreorderSlotPickerProps) {
  // Bornes : min = now + leadHours, max = now + 7 jours
  const { minDateStr, maxDateStr } = useMemo(() => {
    const now = new Date();
    const min = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
    const max = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      minDateStr: toDateInputValue(min),
      maxDateStr: toDateInputValue(max),
    };
  }, [leadHours]);

  const [dateStr, setDateStr] = useState<string>(
    currentValue ? toDateInputValue(currentValue) : minDateStr,
  );
  const [timeStr, setTimeStr] = useState<string>(
    currentValue ? toTimeInputValue(currentValue) : '12:00',
  );
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!dateStr || !timeStr) {
      setError('Veuillez choisir une date et une heure');
      return;
    }
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const [hh, mn] = timeStr.split(':').map(Number);
    const chosen = new Date(yyyy, mm - 1, dd, hh, mn, 0, 0);
    const minAllowed = new Date(Date.now() + leadHours * 60 * 60 * 1000);
    if (chosen < minAllowed) {
      setError(
        `Le créneau doit être au moins ${leadHours}h après maintenant (préavis vendeur)`,
      );
      return;
    }
    const maxAllowed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (chosen > maxAllowed) {
      setError('Le créneau ne peut pas être à plus de 7 jours');
      return;
    }
    setError(null);
    onSelect(chosen);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-picker-title"
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 id="slot-picker-title" className="font-bold text-lg text-gray-900">
                  Date et heure de retrait
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Le vendeur a besoin de minimum <strong>{leadHours}h</strong> de préavis.
                </p>
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  Date
                </label>
                <input
                  type="date"
                  value={dateStr}
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => { setDateStr(e.target.value); setError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Clock className="w-4 h-4" />
                  Heure
                </label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => { setTimeStr(e.target.value); setError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700"
              >
                Valider le créneau
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helpers : formatage local pour les inputs HTML (YYYY-MM-DD / HH:mm).
function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mn}`;
}
```

- [ ] **Step 3: Lint check**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web && bun run lint 2>&1 | tail -10
```
Expected: 0 nouveaux errors sur le fichier.

### Task B3: Commit Phase B

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add apps/web/components/cart/cart-mode-conflict-dialog.tsx \
        apps/web/components/checkout/preorder-slot-picker.tsx
git commit -m "$(cat <<'EOF'
feat(ui): modals CartModeConflictDialog + PreorderSlotPicker

CartModeConflictDialog : dialog "Vider et ajouter / Annuler" affichée
quand le client tente de mixer un produit madeToOrder avec un produit
standard dans le panier.

PreorderSlotPicker : modal date+heure (inputs HTML natifs) avec
validation lead time vendor-specific (min = now + leadHours, max +7j).
Validation inline en cas de créneau hors bornes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Intégration restaurant-menu (guard add-to-cart)

### Task C1: Brancher CartModeConflictDialog dans restaurant-menu

**Files:**
- Modify: `apps/web/components/restaurants/restaurant-menu.tsx`

- [ ] **Step 1: Lire le fichier pour repérer la structure**

Run:
```bash
wc -l /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/restaurants/restaurant-menu.tsx
grep -n "useAddToCart\|useCart\|onClick.*[Aa]jout\|handleAdd\|addToCart\|mutateAsync" /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/components/restaurants/restaurant-menu.tsx | head -20
```

Le sub-agent doit identifier :
- L'appel actuel à `useAddToCart(token)` (probablement `const addToCart = useAddToCart(token);`)
- Le handler qui appelle `addToCart.mutateAsync({...})` (probablement dans un `onClick` de bouton "Ajouter")
- La présence ou non de `useCart` (peut-être absent — il faudra l'ajouter pour le check)

- [ ] **Step 2: Étendre les imports**

Au top du fichier, étendre l'import depuis `@lilia/api-client` pour inclure `useCart` et `useClearCart` :
```typescript
import {
  // ...imports existants
  useCart,
  useAddToCart,
  useClearCart,
} from '@lilia/api-client';
```

Ajouter (ou étendre) l'import depuis `@lilia/utils` :
```typescript
import { hasPreorderConflict, isPreorderCart /* + autres déjà importés */ } from '@lilia/utils';
```

Et l'import du nouveau composant + types React :
```typescript
import { useState } from 'react';
import type { Product, ProductVariant } from '@lilia/types';
import { CartModeConflictDialog } from '@/components/cart/cart-mode-conflict-dialog';
```

(Si `useState` est déjà importé, ne pas dupliquer.)

- [ ] **Step 3: Ajouter le state + hooks dans le composant**

Dans le composant (probablement `export function RestaurantMenu(...)` ou similaire), juste après les hooks existants :
```typescript
const { data: cart } = useCart(token);
const clearCart = useClearCart(token);
const [conflictDialog, setConflictDialog] = useState<{
  open: boolean;
  product: Product | null;
  variant: ProductVariant | null;
} | null>(null);
```

(Si `token` n'est pas déjà en scope, l'extraire via `useAuthStore` comme dans `panier/page.tsx`.)

- [ ] **Step 4: Créer le handler handleAddToCart**

Ajouter dans le composant (avant le `return`) :
```typescript
const handleAddToCart = async (product: Product, variant: ProductVariant) => {
  if (hasPreorderConflict(cart, product)) {
    setConflictDialog({ open: true, product, variant });
    return;
  }
  try {
    await addToCart.mutateAsync({
      productId: product.id,
      variantId: variant.id,
      quantite: 1,
    });
    toast.success(`${product.nom} ajouté au panier`);
  } catch (e) {
    toast.error('Impossible d\'ajouter au panier');
  }
};

const handleConfirmConflict = async () => {
  if (!conflictDialog?.product || !conflictDialog?.variant) return;
  try {
    await clearCart.mutateAsync();
    await addToCart.mutateAsync({
      productId: conflictDialog.product.id,
      variantId: conflictDialog.variant.id,
      quantite: 1,
    });
    toast.success(`Panier vidé. ${conflictDialog.product.nom} ajouté.`);
  } catch (e) {
    toast.error('Erreur lors du remplacement du panier');
  } finally {
    setConflictDialog(null);
  }
};
```

(Si `toast` n'est pas importé : `import { toast } from 'sonner';`.)

- [ ] **Step 5: Remplacer l'appel direct addToCart.mutateAsync par handleAddToCart**

Repérer chaque `onClick` qui appelait directement `addToCart.mutateAsync(...)` (ou `addToCart.mutate(...)`) et remplacer par un appel à `handleAddToCart(product, variant)` en passant les bons arguments. La structure JSX existante détermine d'où viennent `product` et `variant` — adapter au scope.

Exemple type :
```tsx
// Avant
<button onClick={() => addToCart.mutateAsync({ productId: p.id, variantId: v.id, quantite: 1 })}>
  Ajouter
</button>

// Après
<button onClick={() => handleAddToCart(p, v)}>
  Ajouter
</button>
```

- [ ] **Step 6: Rendre le composant CartModeConflictDialog**

À la fin du JSX retourné par le composant (avant le `</...>` final), ajouter :
```tsx
<CartModeConflictDialog
  open={conflictDialog?.open === true}
  cartIsPreorder={isPreorderCart(cart)}
  incomingProductName={conflictDialog?.product?.nom ?? ''}
  onConfirm={handleConfirmConflict}
  onCancel={() => setConflictDialog(null)}
/>
```

- [ ] **Step 7: Lint + typecheck**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web && bun run lint 2>&1 | tail -10
```
Expected: 0 nouveaux errors.

Si le projet a un typecheck séparé (vérifier `package.json`) :
```bash
bun run typecheck 2>&1 | tail -5
```
Sinon `bun run build 2>&1 | tail -10` couvre.

### Task C2: Commit Phase C

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add apps/web/components/restaurants/restaurant-menu.tsx
git commit -m "$(cat <<'EOF'
feat(restaurants): guard add-to-cart avec dialog de conflit preorder

Avant chaque add-to-cart, check hasPreorderConflict(cart, product).
Si conflit (mixer madeToOrder avec standard) → CartModeConflictDialog
proposant "Vider et ajouter" ou "Annuler". Cohérent avec mobile LIL-122.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Intégration checkout (panier/page.tsx)

### Task D1: Brancher PreorderSlotPicker dans le checkout

**Files:**
- Modify: `apps/web/app/(protected)/panier/page.tsx`

- [ ] **Step 1: Lire la structure de la page**

Run:
```bash
grep -n "createOrder.mutateAsync\|handleCheckout\|onClick.*[Vv]alider\|disabled=" /Users/henokmipoks/Desktop/code/lilia-food-web/apps/web/app/\(protected\)/panier/page.tsx | head -20
```

Le sub-agent doit identifier :
- Le handler qui appelle `createOrder.mutateAsync({...})` (probablement nommé `handleCheckout` ou inline dans un `onClick`)
- Le bouton submit principal "Valider et payer" et son `disabled` actuel
- L'endroit où placer la section preorder (logiquement entre la section paiement et le bouton submit)

- [ ] **Step 2: Étendre les imports**

Au top du fichier :
- Ajouter `Calendar as CalendarIcon, AlertTriangle` à l'import `lucide-react` existant
- Ajouter `isPreorderCart` à l'import `@lilia/utils` existant
- Ajouter `useRestaurant` à l'import `@lilia/api-client` existant
- Nouvelle ligne : `import { PreorderSlotPicker } from '@/components/checkout/preorder-slot-picker';`

- [ ] **Step 3: Ajouter le state preorder**

Après les `useState` existants (~ligne 60, après `const [checkoutLoading, setCheckoutLoading] = useState(false);`) :
```typescript
const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
```

- [ ] **Step 4: Ajouter les derivations preorder**

Après les state preorder :
```typescript
const cartIsPreorder = isPreorderCart(cart);
const firstItemRestaurantId = cart?.items?.[0]?.product?.restaurantId ?? '';
const { data: vendorRestaurant } = useRestaurant(firstItemRestaurantId);
const leadHours = vendorRestaurant?.preorderLeadHours ?? 24;
```

`useRestaurant` a `enabled: !!id` interne — passer string vide est safe (ne fetch pas).

- [ ] **Step 5: Ajouter l'effect de reset scheduledFor**

Juste après les derivations :
```typescript
useEffect(() => {
  if (!cartIsPreorder && scheduledFor) {
    setScheduledFor(null);
  }
}, [cartIsPreorder, scheduledFor]);
```

- [ ] **Step 6: Ajouter le helper formatScheduledForFr**

À la fin du fichier (après le composant `PanierPage`, en dehors), ajouter :
```typescript
function formatScheduledForFr(d: Date): string {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} à ${hh}:${mn}`;
}
```

- [ ] **Step 7: Insérer la section preorder dans le JSX**

Trouver dans le JSX la section qui contient le bouton submit principal "Valider et payer" (ou similaire). **Juste avant** cette section (donc entre la section précédente — typiquement "Mode de paiement" — et le bouton submit), insérer :

```tsx
{cartIsPreorder && (
  <motion.div variants={cardVariants} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-200">
    <div className="flex items-center gap-2 mb-3">
      <CalendarIcon className="w-5 h-5 text-orange-600" />
      <h3 className="font-semibold text-gray-900">
        Date et heure de retrait
        <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
          Requis
        </span>
      </h3>
    </div>

    {scheduledFor ? (
      <div className="flex items-center justify-between gap-3 bg-orange-50 rounded-xl px-4 py-3">
        <div>
          <p className="font-semibold text-gray-900">
            {formatScheduledForFr(scheduledFor)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Préavis vendeur : {leadHours}h
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          Modifier
        </button>
      </div>
    ) : (
      <button
        onClick={() => setPickerOpen(true)}
        className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-orange-300 text-orange-700 font-medium hover:bg-orange-50"
      >
        Choisir un créneau
      </button>
    )}

    <div className="mt-3 flex gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        Le vendeur peut annuler jusqu'à J-1. Remboursement sous 48h.
      </p>
    </div>
  </motion.div>
)}
```

À la toute fin du JSX du composant (juste avant le dernier `</...>`) :
```tsx
<PreorderSlotPicker
  open={pickerOpen}
  leadHours={leadHours}
  currentValue={scheduledFor}
  onSelect={(d) => { setScheduledFor(d); setPickerOpen(false); }}
  onCancel={() => setPickerOpen(false)}
/>
```

- [ ] **Step 8: Modifier le submit handler**

Trouver la fonction qui contient `await createOrder.mutateAsync({...})` (ou similaire). En tout début de fonction, ajouter le guard :
```typescript
if (cartIsPreorder && !scheduledFor) {
  toast.error('Veuillez choisir un créneau de retrait pour cette pré-commande');
  return;
}
```

Dans l'appel `createOrder.mutateAsync({...})`, ajouter le champ :
```typescript
await createOrder.mutateAsync({
  paymentMethod,
  adresseId: isDelivery ? selectedAdresseId : undefined,
  isDelivery,
  notes: notes.trim() || undefined,
  contactPhone: contactPhone.trim() || undefined,
  promoCode: promoResult?.code,
  useLoyaltyPoints,
  scheduledFor: scheduledFor ? scheduledFor.toISOString() : undefined,
});
```

(Adapter aux noms de variables existants s'ils diffèrent légèrement — `notes`, `promoResult`, etc.)

- [ ] **Step 9: Étendre le disabled du bouton submit**

Repérer le bouton submit principal "Valider et payer". Étendre son `disabled` :
```tsx
<button
  disabled={
    checkoutLoading ||
    phoneError ||
    !contactPhone ||
    (isDelivery && !selectedAdresseId) ||
    (cartIsPreorder && !scheduledFor)  // ← nouveau
  }
  // ...
>
  Valider et payer
</button>
```

(Le condition exact existant peut différer — préserver toutes les conditions actuelles et **ajouter** uniquement la dernière.)

- [ ] **Step 10: Build check**

Run:
```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run build 2>&1 | tail -15
```
Expected: build success. Tout TS error → fix avant commit.

### Task D2: Commit Phase D

- [ ] **Step 1: Commit**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git add apps/web/app/\(protected\)/panier/page.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): section preorder + picker modal + envoi scheduledFor

Sur un panier contenant un produit madeToOrder :
- Section "Date et heure de retrait" avec bouton "Choisir un créneau"
- Modal PreorderSlotPicker avec lead time vendor-specific (preorderLeadHours)
- Disclaimer "Le vendeur peut annuler jusqu'à J-1. Remboursement sous 48h."
- Bouton "Valider et payer" disabled tant que scheduledFor est null
- scheduledFor envoyé en ISO 8601 dans POST /orders/checkout
- Reset auto du scheduledFor si le panier redevient standard

Cohérent avec le flow mobile LIL-122 (équivalent web).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase E — Vérification

### Task E1: Lint + build full

- [ ] **Step 1: Lint global**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run lint 2>&1 | tail -20
```
Expected: 0 errors. Warnings préexistants OK (ne pas chercher à les fixer).

- [ ] **Step 2: Build full**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run build 2>&1 | tail -20
```
Expected: turbo build success sur tous les packages + apps. Si erreur TS → fix.

### Task E2: Smoke test manuel (l'humain le fait)

Cette étape **n'est pas exécutable par un sub-agent** (requiert un navigateur et un compte test). Documenter pour l'humain :

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web && bun run dev
```

Checklist sur `localhost:3000` :
1. Connecté en CLIENT, panier vide → checkout sans bloc preorder
2. Ajouter un produit standard → checkout normal, bouton submit cliquable dès que adresse + téléphone OK
3. Vider le panier
4. Ajouter un produit `madeToOrder` (ex : pâtisserie d'un HOME_COOK) → bloc orange "Date et heure de retrait" apparaît au checkout
5. Cliquer "Choisir un créneau" → modal s'ouvre, date min = aujourd'hui + `leadHours` du vendeur
6. Saisir date trop tôt + Valider → erreur inline rouge, modal reste ouverte
7. Saisir créneau valide + Valider → modal ferme, affichage "Jeudi 30 mai à 14:30" + bouton Modifier
8. Bouton "Valider et payer" reste disabled tant que créneau pas choisi
9. Soumettre → DevTools Network → `POST /orders/checkout` body contient `scheduledFor: "2026-..."`
10. Conflict dialog : panier preorder existant + tenter ajout standard → dialog apparaît
11. "Vider et ajouter" → toast success, panier vidé + item ajouté
12. "Annuler" → panier intact
13. Inverse : panier standard + ajout `madeToOrder` → même dialog
14. Vider le panier preorder → ajouter item standard → vérifier qu'il n'y a plus de bloc preorder et que `scheduledFor` est null

### Task E3: Push branche

- [ ] **Step 1: Push**

```bash
cd /Users/henokmipoks/Desktop/code/lilia-food-web
git push -u origin hmipoka/web-client-preorder 2>&1 | tail -10
```

Expected: branche poussée, GitHub propose URL de PR.

### Task E4: PR

L'humain crée la PR via GitHub. Description suggérée :

```markdown
## Summary
- Équivalent web de LIL-122 (preorder UX mobile)
- `CreateOrderDto.scheduledFor` ajouté côté types front
- Helpers `isPreorderCart` / `hasPreorderConflict` dans `@lilia/utils`
- 2 nouvelles modals : `CartModeConflictDialog` (mixer modes interdit) + `PreorderSlotPicker` (date+heure avec lead time vendor-specific)
- Section preorder conditionnelle au checkout `/panier`
- Disclaimer remboursement + bouton submit conditionnel

## Test plan
- [x] Lint + build green
- [ ] Smoke test manuel checklist (voir docs/superpowers/plans/2026-05-31-web-preorder-picker.md Phase E Task E2)
- [ ] Vérif DevTools Network que `scheduledFor` est dans le payload POST /orders/checkout
```

---

## Récap commits attendus

| Phase | Commit |
|---|---|
| A3 | `feat(types,utils): scheduledFor sur CreateOrderDto + helpers cart preorder` |
| B3 | `feat(ui): modals CartModeConflictDialog + PreorderSlotPicker` |
| C2 | `feat(restaurants): guard add-to-cart avec dialog de conflit preorder` |
| D2 | `feat(checkout): section preorder + picker modal + envoi scheduledFor` |

4 commits, 1 branche, 1 PR. Vérif manuelle sur device par l'humain.
