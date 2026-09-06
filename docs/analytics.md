# Contrat Analytics Lilia Food

**Document de référence pour les trois plateformes** : site web Next.js,
application Flutter Android, application Flutter iOS.

Ce document fait autorité. Un événement qui n'y figure pas n'existe pas ; un
événement qui s'appelle autrement dans le code est un défaut, pas une variante.

> **Pourquoi ce document existe.** Trois systèmes de mesure indépendants
> produisent trois vocabulaires. On ne s'en aperçoit pas au moment de les
> écrire — on s'en aperçoit six mois plus tard, en essayant de comparer un taux
> de conversion web à un taux de conversion mobile, et en découvrant qu'un côté
> compte `restaurant_viewed` à l'ouverture d'une fiche et l'autre
> `restaurant_clicked` à l'affichage d'une carte de liste. Les deux chiffres
> existent, aucun ne se compare, et la seule issue est de tout réinstrumenter.

---

## 1. Le tunnel officiel

```
VISITEUR
   ↓  page_view          Une page / un écran est consulté
   ↓  restaurant_view    La FICHE d'un vendeur est ouverte
   ↓  product_view       La FICHE d'un produit est ouverte
   ↓  add_to_cart        Le serveur a accepté un ajout au panier
   ↓  view_cart          Le panier est affiché, non vide
   ↓  begin_checkout     Le client engage sa commande (« Commander »)
   ↓  payment_started    Une tentative d'encaissement existe côté serveur
   ↓  payment_success    Le prestataire a CONFIRMÉ l'encaissement au serveur
   ↓  order_created      La commande existe en base
```

**Neuf événements. Pas dix.** Les noms sont identiques sur les trois
plateformes, à la lettre près.

⚠️ **`order_created` précède `payment_started` dans le temps réel.** La commande
est créée d'abord (`POST /orders/checkout`), l'encaissement ensuite
(`POST /payments`) : on ne peut pas encaisser une commande qui n'existe pas.
L'ordre du schéma ci-dessus est celui du tunnel *marketing* (l'entonnoir se lit
du plus large au plus étroit) ; l'ordre chronologique du code est
`begin_checkout → order_created → payment_started → payment_success`. Les deux
sont vrais et il ne faut pas essayer de les réconcilier en déplaçant un
événement.

### Variantes interdites

Pour un même fait métier, une seule graphie. Les noms suivants **ne doivent
jamais réapparaître** :

`restaurant_open` · `restaurant_opened` · `view_restaurant` ·
`restaurant_clicked` · `restaurant_viewed` · `vendor_view` ·
`add_to_cart_from_home` · `popular_dish_tap` · `popular_restaurant_tap` ·
`recommendation_tap`

Un test automatisé le vérifie de chaque côté
(`sanitize.test.ts`, `analytics_contract_test.dart`).

---

## 2. Tableau de référence

| Event | Signification | Paramètres | Web | Android | iOS |
|---|---|---|---|---|---|
| `page_view` | Une page (web) ou un écran (mobile) est consulté | `page_path`, `page_title` (web) · `screen_name` (mobile) | ✅ | ✅ | ✅ |
| `restaurant_view` | La **fiche** d'un vendeur a été ouverte | `restaurant_id`, `restaurant_name` | ✅ | ✅ | ✅ |
| `product_view` | La **fiche** d'un produit a été ouverte | `product_id`, `product_name`, `restaurant_id`, `price` | ✅ | ✅ | ✅ |
| `add_to_cart` | Le serveur a **accepté** un ajout au panier | `product_id`, `product_name`, `restaurant_id`, `price`, `quantity` | ✅ | ✅ | ✅ |
| `view_cart` | Le panier a été affiché avec au moins un article | `item_count`, `cart_total` | ✅ | ✅ | ✅ |
| `begin_checkout` | Le client a engagé sa commande depuis le panier | `item_count`, `cart_total` | ✅ | ✅ | ✅ |
| `payment_started` | Une tentative d'encaissement existe côté serveur | `order_id`, `payment_method`, `amount`, `currency` | ✅ | ✅ | ✅ |
| `payment_success` | Le prestataire a **confirmé** l'encaissement au serveur | `order_id`, `payment_method`, `amount`, `currency` | ⚠️ | ✅ | ✅ |
| `order_created` | La commande **existe** en base | `order_id`, `amount`, `currency`, `item_count` | ✅ | ✅ | ✅ |

⚠️ = mesuré, mais avec une réserve structurelle documentée au §7.

`currency` vaut toujours `XAF`. `amount`, `price` et `cart_total` sont des
entiers de francs CFA — la plateforme n'a pas de centimes.

---

## 3. Règles de déclenchement, événement par événement

### `page_view`

| | Déclencheur | Fichier |
|---|---|---|
| Web | Changement de `pathname` (App Router) | `components/analytics/analytics-provider.tsx` |
| Mobile | Transition de navigation `go_router` | `lib/analytics/analytics_observer.dart` |

- **Web** : GA4 est configuré avec `send_page_view: false`. Sans cela, GA4 en
  envoie un au `config` **et** un à chaque changement d'historique (mesure
  améliorée), ce que fait toute navigation client-side de Next : deux à trois
  `page_view` par page vue, donc un premier étage de tunnel gonflé et tous les
  taux de conversion faux.
- **Web** : `page_path` ne contient **pas** la chaîne de requête. Elle porte les
  termes de recherche saisis par le client, c'est-à-dire du contenu libre — que
  le §5 interdit d'envoyer.
- **Mobile** : émis par un `NavigatorObserver`, jamais depuis un `build`. Un
  `build` est rejoué à chaque changement d'état (clavier, thème, réponse réseau,
  notification) et produirait dix `page_view` par écran.
- **Mobile** : les routes anonymes (modales, feuilles de dialogue) sont
  ignorées. L'observateur émet en plus `screen_view`, l'événement natif de
  Firebase qui alimente les rapports « Écrans ». Nom différent, donc aucun
  double comptage.

### `restaurant_view`

> **L'utilisateur a réellement consulté la page / le détail d'un vendeur.**
> **Pas** : le vendeur est apparu dans une liste.

| | Déclencheur | Fichier |
|---|---|---|
| Web | Montage de la page `/restaurants/[id]` | `components/analytics/track-restaurant-view.tsx` |
| Mobile | `initState` de `RestaurantDetailScreen` | `features/home/presentation/restaurant_detail_screen.dart` |

Les cartes de liste (`vendor-card.tsx`, `restaurant_card.dart`,
`popular_restaurants_section.dart`) n'émettent **rien**. Un tap sur une carte
ouvre la fiche, qui émet. Émettre aussi au tap compterait deux fois la même
consultation ; émettre à l'affichage d'une liste de vingt vendeurs en produirait
vingt, et le deuxième étage du tunnel dépasserait le premier.

### `product_view`

| | Déclencheur | Fichier |
|---|---|---|
| Web | Montage de la page `/produits/[id]` | `components/analytics/track-product-view.tsx` |
| Mobile | `initState` de `ProductDetailPage` | `features/home/presentation/product_detail_page.dart` |

Comme `restaurant_view`, les listes n'émettent **rien** : une ligne de menu, un
plat populaire ou une recommandation mènent à la fiche, et c'est la fiche qui
compte. Un menu de trente plats en émettrait trente, et le troisième étage du
tunnel dépasserait le deuxième.

Le web n'a longtemps pas pu émettre cet événement, faute de fiche produit : le
trou est documenté ci-dessous au §7, et refermé depuis la création de
`/produits/[id]`.

### `add_to_cart`

> **Un ajout réel au panier**, c'est-à-dire accepté par le serveur.

| | Déclencheur | Fichier |
|---|---|---|
| Web | Après `POST /cart/add` réussi — les **trois** chemins | `components/restaurants/restaurant-menu.tsx` |
| Mobile | Après ajout accepté, dans le `.then` | fiche produit, fiche vendeur, plats populaires, recommandations, recherche, suggestion de panier vide |

Le backend refuse un produit épuisé, un vendeur fermé, ou un mélange de modes
dans un même panier (`madeToOrder`). Compter le clic ferait apparaître des
ajouts qui n'ont jamais eu lieu, et le tunnel décrocherait sans raison visible
entre `add_to_cart` et `view_cart`.

Sur le web, les trois chemins d'ajout de `ProductItem` (ajout direct, reprise
après « vider le panier », résolution du conflit de mode) passent par le même
`trackAdded()` : en oublier un rendrait le comptage dépendant de la manière dont
le client s'y est pris.

### `view_cart`

| | Déclencheur | Fichier |
|---|---|---|
| Web | Affichage de `/panier` **et** ouverture du tiroir panier | `app/(protected)/panier/page.tsx`, `components/layout/cart-drawer.tsx` |
| Mobile | Panier chargé à l'ouverture de `CartScreen` | `features/cart/presentation/cart_screen.dart` |

- Un **panier vide n'émet rien** : le compter ferait apparaître des
  consultations de panier sans aucun `add_to_cart` avant elles.
- Mobile : émis dans le `postFrameCallback` d'`initState`, après le
  rafraîchissement — ni dans `build`, ni dans la branche `data:` de
  l'`AsyncValue`, qui sont rejoués à chaque suppression d'article, changement de
  quantité ou retour au premier plan.
- ⚠️ **Asymétrie assumée** : le web a deux surfaces de panier (le tiroir et la
  page), le mobile une seule. Un client web qui ouvre le tiroir puis la page
  émet deux `view_cart`. Le tunnel se lit en **utilisateurs**, où il n'en compte
  qu'un ; en **nombre d'événements**, le web est structurellement au-dessus du
  mobile sur cette seule étape. Comparer les deux plateformes sur cette ligne en
  volume brut serait une erreur de lecture.

### `begin_checkout`

> **Le client engage sa commande** — l'action délibérée, pas l'affichage d'un
> écran.

| | Déclencheur | Fichier |
|---|---|---|
| Web | Clic sur « Commander », après validation du formulaire | `app/(protected)/panier/page.tsx` |
| Mobile | Clic sur « Passer la commande » du panier | `features/cart/presentation/cart_screen.dart` |

**Pourquoi ce choix, et pas l'affichage de l'écran de checkout.** Sur le web, le
panier et la saisie de commande (adresse, téléphone, moyen de paiement) vivent
sur **la même page**. Déclencher `begin_checkout` à l'affichage le rendrait
rigoureusement égal à `view_cart` : une étape de tunnel qui ne perd jamais
personne n'apprend rien, et le web afficherait 100 % de conversion là où le
mobile en afficherait 60. En le posant sur le bouton « Commander », présent à
l'identique des deux côtés, l'étape a la même signification et le même taux de
déperdition à mesurer.

Conséquence côté mobile : l'événement a été **déplacé** du `build` de
`checkout_page.dart` — où il était protégé par un simple booléen d'instance,
inopérant dès que l'écran était quitté puis rouvert (ce qui arrive à chaque
correction d'adresse) — vers le bouton du panier.

### `payment_started`

| | Déclencheur | Fichier |
|---|---|---|
| Web | `POST /payments` a rendu une tentative | `panier/page.tsx`, `components/checkout/payment-panel.tsx` |
| Mobile | `POST /payments` a rendu une tentative | `checkout_page.dart`, `commande_detail_page.dart` |

**Unique par `paymentId`, jamais par commande.** L'appel est sûr à rejouer : le
serveur réutilise la tentative `PENDING` existante — même identifiant — grâce à
l'index unique partiel `payments(orderId) WHERE status='PENDING'`. Un rejeu ne
compte donc pas deux fois. En revanche, une **reprise après échec** crée une
nouvelle tentative avec un identifiant distinct, et elle doit compter : c'est
exactement l'écart entre `payment_started` et `payment_success` qui mesure les
échecs d'opérateur.

Cas particulier : une commande intégralement réglée en points de fidélité produit
un `payment_started` puis immédiatement un `payment_success` (le serveur marque
l'encaissement `SUCCESS` à la création). Sans le premier, ces commandes
apparaîtraient comme des paiements réussis sans paiement lancé et casseraient la
monotonie du tunnel.

### `payment_success`

> **Un paiement réellement confirmé selon la source de vérité du système de
> paiement.** Jamais parce qu'un écran de confirmation s'affiche.

**La source de vérité est `PaymentService.confirmCollection()`**, côté backend
(`lilia-backend/apps/lilia-app/src/modules/payments/services/payment.service.ts`).
C'est le point de transition unique par lequel passent les trois sources
concourantes du prestataire pawaPay :

1. le **webhook** `POST /payments/webhook/pawapay` ;
2. l'**interrogation** `GET /payments/:id/status`, qui appelle le prestataire ;
3. le **cron de réconciliation**.

Toutes trois aboutissent à `applyCollectionProviderStatus()`, qui contrôle le
montant et la devise, puis à `confirmCollection()`, qui réclame la transition en
base :

```ts
const payClaim = await tx.payment.updateMany({
  where: { id: payment.id, status: PaymentStatus.PENDING },
  data:  { status: PaymentStatus.SUCCESS, completedAt: new Date(), … },
});
if (payClaim.count === 0) return false;   // ⇒ 'DUPLICATE' : rien n'est émis
```

**Un webhook rejoué rend `DUPLICATE` et n'émet aucun événement.** C'est la même
autorité qui fait passer la commande de `EN_ATTENTE` à `PAYER` ; aucune autre
source n'a le droit de compter un paiement réussi.

Côté client, on n'ajoute rien à cette vérité — on l'**observe** :

| | Déclencheur | Fichier |
|---|---|---|
| Web | `GET /payments/…` rend `status === 'SUCCESS'` | `components/checkout/payment-panel.tsx` |
| Mobile | `PaymentStatusController` passe en `PaymentWaitPhase.succeeded` | `features/payments/presentation/payment_pending_page.dart` |

Le push FCM `payment_confirmed` **n'est pas** une source : sur mobile il ne fait
que déclencher une vérification immédiate (`onPushReceived()`), et le verdict
vient toujours du serveur. Un payload de notification n'est pas une source
financière.

Unique par `paymentId` — voir §6.

### `order_created`

> **Une commande réellement créée**, pas le clic sur le bouton.

| | Déclencheur | Fichier |
|---|---|---|
| Web | `POST /orders/checkout` a rendu l'identifiant | `app/(protected)/panier/page.tsx` |
| Mobile | `POST /orders/checkout` a rendu l'identifiant | `features/commandes/presentation/checkout_page.dart` |

Le checkout échoue régulièrement — panier sous le minimum du vendeur, produit
épuisé, vendeur fermé, adresse hors zone. Unique par `orderId` : la clé
d'idempotence fait qu'un rejeu rend la **même** commande.

Une commande **annulée** ne retire pas son `order_created` : elle a bel et bien
été créée. L'annulation se lit en base, pas en effaçant un événement passé.

---

## 4. Architecture

Le code métier n'appelle jamais l'outil de mesure. Il appelle l'abstraction.

```
   Écran / composant métier
            │
            │   analytics.track('restaurant_view', {…})        ← web
            │   AnalyticsService.trackRestaurantView(…)        ← mobile
            ▼
   ┌─────────────────────────────────────────────┐
   │  Cœur (AnalyticsCore / LiliaAnalytics)      │
   │   1. liste blanche + désinfection           │
   │   2. déduplication (fenêtre + clé unique)   │
   │   3. diffusion aux collecteurs              │
   └─────────────────────────────────────────────┘
            │                │                │
            ▼                ▼                ▼
          GA4            Clarity          console (dev)
```

**Pourquoi une seule porte.** Le contrat — noms, paramètres autorisés, absence
de données personnelles, déduplication — est appliqué en un seul endroit. Un
appel direct à `gtag()` ou à `FirebaseAnalytics.instance` contournerait les
trois contrôles à la fois. C'est la raison pour laquelle les composants ne
reçoivent jamais le SDK.

### Fichiers

**Web** — `apps/web/lib/analytics/`

| Fichier | Rôle |
|---|---|
| `contract.ts` | Noms d'événements, liste blanche des paramètres, garde-fous PII |
| `sanitize.ts` | Application du contrat à une charge utile |
| `dedupe.ts` | `RepeatGuard` (fenêtre) + `OnceRegistry` (persistant) |
| `core.ts` | `AnalyticsCore` — la classe, sans dépendance à Google |
| `sinks.ts` | GA4, Clarity, console — **les seuls fichiers qui connaissent Google** |
| `index.ts` | Instance partagée `analytics` + lecture des variables d'environnement |

`components/analytics/analytics-provider.tsx` charge les scripts, émet
`page_view` et identifie le client.

**Mobile** — `lilia-app/lib/analytics/`

| Fichier | Rôle |
|---|---|
| `analytics_events.dart` | **Jumeau Dart de `contract.ts`** |
| `analytics_sanitizer.dart` | Application du contrat |
| `analytics_dedupe.dart` | `RepeatGuard` + `OnceRegistry` (SharedPreferences) |
| `lilia_analytics.dart` | Le cœur, sans dépendance à Firebase |
| `analytics_sink.dart` | Firebase, debug, enregistreur de test |
| `analytics_observer.dart` | `page_view` + `screen_view` sur navigation |
| `services/analytics_service.dart` | **Façade typée — le seul point d'entrée des écrans** |

> **Android et iOS exécutent le même code.** Ce ne sont pas deux
> instrumentations tenues en phase par discipline, ce sont deux compilations du
> même fichier. L'égalité des noms entre les deux est une propriété de la
> structure, pas une convention.

### Synchronisation des deux contrats

`contract.ts` et `analytics_events.dart` déclarent la même chose dans deux
langages. Ils vivent dans deux dépôts et **rien ne les compile ensemble** : toute
modification de l'un doit être répercutée sur l'autre dans le même changement.
Les tests des deux côtés vérifient la liste exacte des paramètres attendus, ce
qui fait échouer la CI du côté oublié.

---

## 5. Confidentialité

**Ne partent jamais** : numéro de téléphone, adresse exacte, latitude,
longitude, mot de passe, jeton Firebase, jeton d'authentification, données
bancaires, informations Mobile Money, contenu libre saisi par l'utilisateur
(note au restaurant, terme de recherche, point de repère, message d'erreur d'un
opérateur).

Trois barrières, dans cet ordre :

1. **Liste blanche par événement.** Tout paramètre non déclaré dans
   `EVENT_PARAMS` / `analyticsEventParams` est retiré. Passer un objet `Product`
   ou `Order` entier ne fait donc rien partir d'autre que ses champs
   contractuels.
2. **Fragments de clés interdits** — `phone`, `token`, `latitude`, `adresse`,
   `note`, `message`, `search`… Volontairement redondant avec la première :
   il protège des ajouts futurs à la liste blanche, qu'une revue de code peut
   laisser passer. Le découpage traite la casse chameau (`deliveryLatitude` est
   reconnu) et compare **par segment**, sans quoi `cart_total` contiendrait
   `tel` et tout montant serait rejeté.
3. **Formes de valeurs.** Un numéro congolais, un JWT ou une adresse e-mail sont
   reconnus quel que soit le nom de la clé. Cas réel visé : un vendeur qui met
   son numéro dans le nom de son produit.

Les valeurs texte sont tronquées à 100 caractères ; les objets et tableaux sont
**rejetés** plutôt qu'aplatis — un objet aplati, ce sont des clés qu'aucune liste
blanche n'a validées.

### Corrections apportées à l'existant

L'instrumentation mobile antérieure envoyait :

| Ce qui partait | Où | Correction |
|---|---|---|
| `query` — le terme de recherche saisi | `logSearchFromHome`, appelé **depuis un `build`** | Événement supprimé |
| `error_message` — le texte du serveur ou de l'opérateur | `logOrderFailed` | Remplacé par `failure_kind`, une catégorie fermée |
| `failureMessage` du prestataire | envisagé sur l'échec de paiement | Remplacé par `failure_kind` |

### Identifiant utilisateur

L'identifiant transmis est le **CUID applicatif** (`user.id` côté web,
`AppUser.id` côté mobile) : celui de la table `User` en base.

- **Jamais** le numéro de téléphone, l'e-mail, ni l'UID Firebase. Le téléphone
  et l'e-mail sont des données personnelles ; l'UID Firebase n'est pas le même
  identifiant des deux côtés, et les parcours web et mobile d'un même client ne
  se recolleraient pas.
- Il est **délié** à la déconnexion (`identify(null)`). Sans cela, la session
  d'un visiteur anonyme sur le même navigateur ou le même téléphone resterait
  attribuée au compte précédent.
- Les **visiteurs anonymes restent suivis** : GA4 leur attribue un identifiant
  client, Firebase un identifiant d'installation. Le tunnel complet est
  mesurable sans authentification jusqu'à `add_to_cart` — au-delà, le panier
  exige une session.

Côté mobile, l'identifiant est résolu dans `user_sync_provider.dart`, seul
endroit où il arrive de façon fiable à chaque ouverture de session.

**Propriétés d'audience** : `country = CG`, `currency = XAF`, et `city`
facultative. Aucune donnée personnelle.

**Clarity** ne reçoit que le **nom** des événements, jamais leurs paramètres, et
aucun identifiant utilisateur. Ce n'est pas une limitation subie : Clarity
enregistre des sessions vidéo, et y adjoindre un identifiant de commande ou un
montant rapprocherait un enregistrement d'écran d'une transaction nommée.

---

## 6. Déduplication

Deux mécanismes, parce qu'il y a deux problèmes distincts.

### Le bruit de cycle de vie — fenêtre courte

Une fenêtre d'**une seconde** sur la signature `événement + paramètres`.

| Situation | Effet |
|---|---|
| Double montage React en `StrictMode` | absorbé |
| `useEffect` rejoué (identité d'une dépendance) | absorbé |
| Rendu double d'une navigation Next | absorbé |
| `build()` Flutter rejoué (clavier, thème, réseau) | absorbé |
| Recomposition après notification FCM | absorbé |
| Retour arrière puis réouverture immédiate | absorbé |
| **Seconde consultation réelle, plus tard** | **comptée** |

La fenêtre est délibérément courte : plus longue, elle supprimerait de vraies
consultations répétées — un client qui compare deux fois la même fiche produit
consulte bien deux fois.

### L'unicité métier — clé persistante

`localStorage` (web) et `SharedPreferences` (mobile), bornés à 200 clés.

| Événement | Clé |
|---|---|
| `order_created` | `order_created:<orderId>` |
| `payment_started` | `payment_started:<paymentId>` |
| `payment_success` | `payment_success:<paymentId>` |

Une fenêtre de temps ne protège pas de ces cas-là :

| Situation | Effet |
|---|---|
| Rechargement de la page de commande | 1 seul événement |
| Retour depuis le paiement | 1 seul événement |
| Interrogation du statut toutes les 3 s pendant 3 min | 1 seul événement |
| Réouverture de la commande une semaine plus tard | 1 seul événement |
| Redémarrage de l'application | 1 seul événement |
| **Webhook rejoué côté serveur** | 1 seul événement (le serveur rend `DUPLICATE`) |
| Rejeu de `POST /payments` (même tentative `PENDING`) | 1 seul `payment_started` |
| **Vraie seconde tentative après échec** | **2 `payment_started`** |

L'unicité porte sur l'**objet métier**, jamais sur l'écran qui l'observe :
plusieurs écrans peuvent observer le même paiement, et c'est précisément ce dont
on se protège.

---

## 7. Événements imparfaitement mesurables

Trois réserves, à connaître avant de lire un chiffre.

### ~~`product_view` n'existe pas sur le web~~ — corrigé

**Refermé.** Le site n'avait pas de fiche produit : les produits n'existaient
que comme lignes du menu vendeur, et aucun geste de cette page ne correspondait
à « le client a consulté ce produit ». L'événement n'était donc pas émis, et le
tunnel web sautait de `restaurant_view` à `add_to_cart`.

La route `/produits/[id]` existe depuis septembre 2026 — galerie, description
complète, ingrédients, conservation, précommande, variantes, quantité et ajout
au panier. `product_view` y est émis au montage, et l'étape est de nouveau
comparable entre les trois plateformes.

⚠️ **Conséquence de lecture sur l'historique** : les données antérieures à cette
date ne portent aucun `product_view` web. Toute comparaison de tunnel qui
enjambe cette date montrera une marche artificielle.

⚠️ **Le raccourci « + » de la liste subsiste**, volontairement : un menu est une
liste dans laquelle on commande vite. Un `add_to_cart` web peut donc arriver
**sans** `product_view` avant lui. Ce n'est pas une anomalie — le tunnel n'exige
pas que chaque étape soit franchie.

### `payment_success` n'est observé que si le client regarde

Le web et le mobile **observent** la confirmation du serveur ; ils ne la
reçoivent pas passivement. Un paiement confirmé après que le client a fermé
l'onglet, quitté l'application ou perdu le réseau ne sera jamais compté côté
client.

Sur le parcours nominal ce cas est rare : après le checkout, le web redirige
vers le détail de la commande — où le panneau de paiement interroge toutes les
3 s pendant 3 min — et le mobile ouvre un écran d'attente dédié dont le retour
arrière est neutralisé. Mais sur une 4G de Brazzaville qui coupe, c'est un cas
réel.

**Conséquence de lecture** : `payment_success` côté analytics est un
**minorant**. La vérité comptable est en base (`Payment.status = SUCCESS`,
`Order.paidAt`). Un écart entre les deux n'est pas un bug de paiement.

**Correction possible** : émettre `payment_success` depuis le backend via le
*Measurement Protocol* de GA4, au moment de `confirmCollection()`. C'est le seul
moyen d'atteindre 100 % de couverture, et cela demande de transporter
l'identifiant client GA4 jusqu'au serveur. À décider séparément.

### `page_view` mobile ne compte pas les modales

L'observateur ignore les routes anonymes. Une feuille de dialogue de choix de
variante, une modale de conflit de panier ou une confirmation ne comptent pas
comme des écrans — les compter ferait apparaître autant de « pages » que de
confirmations affichées.

---

## 8. Incohérences de flux signalées

Rien n'a été modifié dans la logique métier des commandes, des paiements ou des
stocks pour installer la mesure. Deux constats faits pendant l'instrumentation,
à traiter séparément :

1. ~~**Le web n'a pas de fiche produit**~~ — **corrigé** (voir §7). C'était une
   lacune de parcours avant d'être une lacune de mesure : le client web ne
   pouvait pas lire la description complète d'un plat avant de l'ajouter. La
   route `/produits/[id]` la comble.
2. **`begin_checkout` a dû changer de définition côté mobile** parce que le web
   fusionne le panier et le tunnel de commande sur une seule page. Les deux
   parcours convergent maintenant sur le même geste, mais l'asymétrie
   d'interface demeure : le mobile demande trois écrans là où le web en demande
   un.

---

## 9. Configuration

### Web

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX   # GA4
NEXT_PUBLIC_GA_ID=                           # ancien nom, lu en repli
NEXT_PUBLIC_CLARITY_PROJECT_ID=              # Clarity (facultatif)
```

Variable absente ⇒ aucun script chargé et `analytics.track()` ne fait rien. Le
site fonctionne à l'identique en local et en préproduction, sans polluer les
statistiques. En développement, les événements sont affichés en console — c'est
le seul moyen de vérifier une instrumentation avant de la déployer.

⚠️ `NEXT_PUBLIC_GA_ID` est le nom utilisé jusqu'ici en production ; il reste lu
en repli. Renommer une variable d'environnement sans repli, c'est éteindre la
mesure au premier déploiement et ne s'en apercevoir qu'en consultant les
rapports.

### Mobile

Aucune variable : Firebase Analytics lit `google-services.json` (Android) et
`GoogleService-Info.plist` (iOS). `AnalyticsService.init()` est appelé dans
`main()`, après `Firebase.initializeApp()`.

---

## 10. Tests

| Fichier | Couverture |
|---|---|
| `apps/web/lib/analytics/sanitize.test.ts` | liste blanche, PII (clés + valeurs), troncature, conformité du contrat |
| `apps/web/lib/analytics/core.test.ts` | déduplication, tunnel complet, cas d'erreur, robustesse, identification |
| `lilia-app/test/analytics/analytics_contract_test.dart` | miroir Dart du premier |
| `lilia-app/test/analytics/lilia_analytics_test.dart` | miroir Dart du second, plus la façade |

Les deux jeux vérifient les **mêmes règles sur les mêmes données**. C'est ce qui
rend vérifiable l'affirmation « les trois plateformes envoient la même chose ».

```bash
# Web
pnpm --filter web test

# Mobile (Android et iOS partagent le code testé)
flutter test test/analytics/
```

---

## 11. Ce qu'il reste à faire hors du code

1. **Créer la propriété GA4** et renseigner `NEXT_PUBLIC_GA_MEASUREMENT_ID` dans
   les variables d'environnement Vercel (production **et** préproduction).
2. **Désactiver la mesure améliorée « Page changes based on browser history
   events »** dans GA4 (Admin → Flux de données → Mesure améliorée).
   `send_page_view: false` ne couvre que l'envoi initial ; sans cette
   désactivation, chaque navigation client-side de Next produit un `page_view`
   automatique **en plus** du nôtre.
3. **Déclarer les paramètres personnalisés** dans GA4 (Admin → Définitions
   personnalisées) : `restaurant_id`, `restaurant_name`, `product_id`,
   `product_name`, `price`, `quantity`, `item_count`, `cart_total`, `order_id`,
   `payment_method`, `failure_kind`. Sans cette déclaration, les paramètres sont
   transmis mais **invisibles dans les rapports**.
4. **Marquer comme conversions** : `order_created` et `payment_success`.
5. **Construire le tunnel** dans GA4 → Explorations → Exploration d'entonnoir,
   avec les neuf étapes dans l'ordre chronologique
   (`page_view → restaurant_view → product_view → add_to_cart → view_cart →
   begin_checkout → order_created → payment_started → payment_success`).
6. **Créer le projet Clarity** et renseigner `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
7. **Vérifier le flux mobile** dans Firebase → Analytics → DebugView, sur un
   **appareil réel** :
   ```bash
   # Android
   adb shell setprop debug.firebase.analytics.app com.dreesis.lilia.liliaApp
   # iOS : ajouter -FIRAnalyticsDebugEnabled aux arguments de lancement Xcode
   ```
8. **Relier GA4 et Firebase** sur le même projet, pour que le web et le mobile
   alimentent la même propriété et que le tunnel soit lisible d'un seul endroit.
