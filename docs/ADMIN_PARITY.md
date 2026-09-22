# Back-offices : Admin Web ↔ Admin Flutter — rôles et parité

Décidé le 22/09/2026 (remédiation `ADM-PARITY-001`, audit
`ADMIN_WEB_CLIENT_FINAL_PRODUCTION_AUDIT_2026-09-22.md`).

## Rôles

| Interface | Rôle |
|---|---|
| **Admin Web** (`apps/admin`) | **Back-office de référence.** Toute fonction d'exploitation critique y est disponible. Un poste suffit pour gérer une urgence. |
| **Admin Flutter** (`lilia-food-admin`) | **Compagnon mobile** : suivi des commandes, tri des vendeurs, contrôle terrain. Il n'a pas vocation à tout couvrir. |

Règle : **une fonction critique n'existe jamais seulement dans l'Admin
Flutter.** L'inverse est admis si c'est une décision écrite ici.

## Matrice (backend = source de vérité unique)

| Fonction | Backend | Admin Web | Admin Flutter | Décision |
|---|---|---|---|---|
| Paramètres plateforme (frais, commission, fidélité, parrainage) | ✅ | ✅ | ✅ | parité ; PATCH des seuls champs modifiés + verrou `expectedUpdatedAt` des deux côtés |
| Maintenance | ✅ | ✅ | ✅ | parité |
| Mise à jour de l'app client (`minAppVersion`…) | ✅ (autorité : `app-update-policy.ts`) | ✅ depuis le 22/09 | ✅ | parité ; mêmes règles, mêmes vecteurs de test |
| Minimum de commande | ✅ (par vendeur) | ✅ fiche vendeur | ✅ onboarding | parité |
| Mode de paiement / providers | ✅ (env + `/payments/providers`) | lecture | lecture | configuration serveur, pas d'UI d'écriture (voulu) |
| Restaurants / vendeurs | ✅ | ✅ | ✅ | parité |
| Produits / catégories / menus | ✅ | ✅ | ✅ | parité |
| Commandes (liste paginée, statuts) | ✅ | ✅ | ✅ | parité |
| Commandes bloquées (`/orders/restaurant/stuck`) | ✅ | ✅ | ❌ | **Web seulement** — surveillance de poste |
| Promotions | ✅ | ✅ | ❌ | **Web seulement** — saisie longue, pas un geste mobile |
| Bannières | ✅ | ❌ | ✅ | **Flutter seulement** — éditorial, non critique ; à porter au Web si l'équipe éditoriale travaille sur poste |
| Journal d'audit | ✅ | ✅ depuis le 22/09 (`/journal`) | ✅ | parité (lecture seule) |
| Livreurs : création, activation, désactivation | ✅ | ✅ | ❌ (lecture, stats) | **Web seulement** — ⚠️ désactiver un livreur en urgence exige un poste |
| Utilisateurs : rôle, bannissement | ✅ | ✅ | ❌ | **Web seulement** — ⚠️ idem |
| Paiements : confirmer / rejeter (MANUAL) | ✅ | ✅ | ✅ | parité |
| Paiements : rapprochement pawaPay | ✅ | ✅ | ❌ | **Web seulement** |
| Reversements vendeur (par commande) | ✅ | ✅ | ✅ | parité ; idempotence côté serveur |
| File des reversements (`/admin/payouts`) | ✅ | ✅ | ❌ | **Web seulement** |

## Ce qui reste un risque assumé

Les gestes de sécurité « désactiver un livreur » et « bannir un compte » ne
sont pas disponibles sur mobile. Si l'astreinte se fait téléphone en main, ils
sont les premiers à porter dans l'Admin Flutter.

## Tenir cette matrice à jour

Ajouter une route d'administration au backend sans l'inscrire ici revient à
recréer le problème d'origine : une fonction disponible dans une seule
interface sans que personne l'ait décidé.
