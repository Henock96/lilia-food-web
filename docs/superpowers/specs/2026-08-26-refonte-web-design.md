# Refonte visuelle du site client — « chaleur du marché »

**Date :** 2026-08-26
**Périmètre :** `apps/web` uniquement (le site client). `apps/admin` n'est pas concerné.
**Statut :** conception validée, prête pour le plan d'implémentation.

---

## 1. Pourquoi

Le site actuel est jugé « trop sophistiqué » et en décalage avec le logo Lilia Food.

Le logo est en **bichromie stricte** — rouge tomate sur crème, trait dessiné à la
main, registre artisanal. Le site part dans l'autre sens :

- mode sombre par défaut, alors que le logo est conçu sur fond crème ;
- Fraunces serif **en italique** dans chaque titre, avec jeu bicolore ;
- eyebrows en capitales espacées (« LA MARKETPLACE », « SIMPLE COMME BONJOUR ») ;
- halos flous et grille en fond de hero ;
- badges rose / orange / vert qui n'appartiennent à aucune charte ;
- **hero révélé par animations séquentielles sur ~10 secondes** — mesuré le
  2026-08-26 sur `www.liliafood.com` : à 7 s, seul le badge « Livraison en cours à
  Brazzaville » était affiché. Sur une connexion de Brazzaville, c'est une page
  quasi vide pendant l'essentiel de l'attente.

Direction retenue : **« chaleur du marché »** — couleurs franches, photo en grand,
peu de blanc, vivant et populaire plutôt que calme et luxueux. Le « premium » vient
de la qualité des photos et de la tenue de la mise en page, pas de la décoration.

## 2. Contraintes réelles

Ces contraintes ont dicté plusieurs choix ; les ignorer ferait échouer la refonte.

1. **Un seul vendeur en base** (« Chez Maman Lili ») en production au 2026-08-26.
   Toute mise en page supposant une grille pleine se lira comme un site cassé.
2. **Les photos réelles arrivent** — le founder en produit. Aujourd'hui la home
   utilise des visuels Unsplash génériques et des avatars `i.pravatar.cc`.
3. **Connexions lentes** (Brazzaville, téléphones d'entrée de gamme). Le poids du
   hero et le nombre de familles de polices comptent directement.
4. **Lisibilité en plein soleil** sur mobile — d'où les exigences de contraste
   du § 3.1.

## 3. Système de design

### 3.1 Couleurs

La palette passe de six familles (orange, crème, charcoal, bleu encre, sémantiques,
surfaces sombres) à **trois**. Le bleu encre disparaît : aucun lien avec le logo.

| Token | Valeur | Usage |
|---|---|---|
| `tomato-500` | `#EF4423` | Aplats, bordures, gros titres, état actif |
| `tomato-600` | `#D2371A` | **Fond des boutons**, survol |
| `tomato-700` | `#B8300F` | **Texte rouge sur crème** |
| `cream-100` | `#FDF4E8` | Fond de toutes les pages |
| `cream-200` | `#F6E7D2` | Surfaces secondaires, emplacements vides |
| `white` | `#FFFFFF` | Cartes uniquement — jamais en fond de page |
| `ink-900` | `#1C1815` | Texte principal |
| `ink-500` | `#6B615A` | Texte secondaire |

**Les trois nuances de rouge ne sont pas cosmétiques, elles sont imposées par le
contraste** (vérifié, ratios WCAG sur fond crème `#FDF4E8`) :

- `#EF4423` sur crème → **3,5:1**. Sous le minimum de 4,5:1 → **interdit pour du
  texte**. Reste valable pour aplats, bordures et texte ≥ 24 px.
- Blanc sur `#EF4423` → **3,8:1**. Insuffisant → **un bouton rouge à texte blanc
  doit utiliser `#D2371A`** (4,9:1).
- `#B8300F` sur crème → **5,6:1**. C'est le seul rouge utilisable en texte courant.

L'écart visuel entre les trois est imperceptible ; l'écart de lisibilité ne l'est pas.

**Couleurs sémantiques.** La couleur de marque est un rouge, et le rouge est la
couleur universelle de l'erreur. Pour que « Commander » et « Paiement refusé » ne se
confondent pas, l'erreur est décalée vers un rouge plus sombre et plus froid
(`#B3261E`), et le succès vers un vert profond (`#0F7B4A`) plutôt que vif.

### 3.2 Typographie

- **Titres : Bricolage Grotesque** (variable). Formes légèrement irrégulières,
  presque tracées à la main — c'est le point commun avec le logo. Variable, donc
  toutes les graisses pour une seule ressource chargée.
- **Texte : Inter** — déjà en place, conservé.
- **Fraunces est supprimée**, ainsi que **tous les titres en italique** et **tous les
  eyebrows en capitales espacées**. C'est le principal marqueur du « trop
  sophistiqué ».

### 3.3 Mode sombre : supprimé

Un seul thème, clair. Disparaissent : le bloc de variables `.dark` de
`globals.css`, `theme-provider.tsx`, le bouton de bascule du header, et toutes les
classes `dark:` des composants.

Raison : le logo est conçu sur crème, et un thème unique divise par deux la surface
à dessiner et à vérifier.

## 4. Structure des pages

### 4.1 Home

Cinq blocs, dans cet ordre :

1. **Hero** (~280 px, contre presque un plein écran aujourd'hui) — photo de fond,
   titre de marque fixe en haut à gauche, et une rangée de **cartes vendeurs
   cliquables** en bas. La carte active est bordée de `tomato-500` ; cliquer une
   carte change la photo de fond. Trois cartes sont visibles simultanément sur
   grand écran (défilement horizontal au-delà, et sur mobile) ; le nombre de
   vendeurs présentés est fixé au § 5.1. Voir § 5 pour le comportement.
2. **Catégories** — quatre familles (Restaurants, Cuisines maison, Boulangeries,
   Boissons). Celles sans photo utilisent des **aplats** (rouge, crème, encre)
   plutôt que des images Unsplash génériques : c'est franc, et remplaçable par une
   vraie photo sans retoucher la mise en page. `GROCERY` reste exclu, comme
   aujourd'hui dans `VendorTypeChips`.
3. **Catalogue** — les vendeurs ouverts, en grille. Les emplacements vides sont
   **montrés en pointillés** (« Prochain vendeur ici »), pas masqués : une case
   explicite se lit comme un service qui démarre, une case blanche comme un bug.
4. **Comment ça marche** — bande compacte sur `cream-200`, pas une grande section.
5. **Devenir vendeur** — bloc `tomato` pleine largeur, délibérément la section la
   plus voyante de la page : avec un vendeur en base, recruter des vendeurs importe
   plus que convertir des clients.

**Supprimés de la home :** témoignages, bandeau de téléchargement, promos.

Les **témoignages étaient fabriqués** — avatars `i.pravatar.cc` (visages
placeholder) et textes codés en dur dans `lib/home-content.ts`, affichés en
production comme des avis réels. Ils sont retirés, pas redessinés. Le backend
dispose déjà d'un système de reviews à brancher quand il y aura de vrais avis.

Les **promos** (dont le code `BIENVENUE20`) étaient également codées en dur, sans
garantie d'existence côté backend. Retirées faute de pouvoir confirmer les offres.

Le **bandeau de téléchargement** est retiré tant qu'il n'y a pas les deux stores
(seul un lien Play Store existait).

### 4.2 Catalogue et fiche vendeur

Même grammaire : fond crème, filtres en chips rouge/crème **sans emoji**, cartes
blanches. Sur la fiche vendeur, la photo de couverture est abaissée pour que le
menu remonte au-dessus de la ligne de flottaison.

### 4.3 Écrans hors périmètre

Panier, commandes, profil, favoris, connexion, inscription : ils **héritent des
nouveaux tokens** (couleurs, police) mais **ne sont pas redessinés**. Aucune
modification de mise en page ni de logique métier — le tunnel de commande touche au
panier mono-mode, aux précommandes et aux points de fidélité, hors sujet ici.

## 5. Comportement du hero

### 5.1 Règle de repli — obligatoire

Un vendeur est **éligible** au hero s'il est actif, approuvé, et possède une photo
de couverture.

- **Moins de 2 vendeurs éligibles** → pas de défilement du tout : une photo, le
  titre, **ni puces ni cartes**. C'est l'état actuel de la production.
- **2 et plus** → le slider s'active seul. Maximum **5 slides**, les vendeurs
  ouverts d'abord.
- **Aucun vendeur éligible** → slide de marque unique avec une photo statique
  servie depuis `public/`.

Sans cette règle, le hero est vide au lancement.

### 5.2 Performance et accessibilité

Ces règles existent pour ne pas reproduire le défaut des 10 secondes :

- Le titre et les cartes sont **présents au premier rendu**. Aucune animation
  d'entrée, aucune révélation séquentielle.
- Première image chargée en priorité, les suivantes en différé.
- Transition entre slides : fondu de 400 ms maximum.
- Défilement automatique toutes les **6 s**, interrompu au survol et au focus
  clavier.
- Défilement automatique **désactivé** sous `prefers-reduced-motion`.
- Cartes navigables au clavier ; changement de slide annoncé via `aria-live`.

## 6. Fichiers touchés

**Supprimés**
`components/home/testimonials.tsx`, `components/home/app-download-banner.tsx`,
`components/home/promo-strip.tsx`, `components/theme-provider.tsx`, les données
`HOME_PROMOS` et `HOME_TESTIMONIALS` de `lib/home-content.ts`, le bouton de thème
dans `components/layout/header.tsx`.

Dans `next.config.ts`, la allowlist `images.remotePatterns` perd **`i.pravatar.cc`**
(avatars placeholder) **et `images.unsplash.com`** : après la refonte, plus aucun
visuel ne provient d'une banque d'images — les catégories utilisent des aplats et la
photo de repli du hero est servie depuis `public/`. Retirer ces hôtes garantit
qu'aucune image de stock ne se réintroduise silencieusement plus tard.

**Réécrits**
`app/globals.css` (tokens, suppression du bloc `.dark`),
`components/home/hero-section.tsx` → nouveau `components/home/hero-slider.tsx`,
`category-rail.tsx`, `featured-restaurants.tsx`, `how-it-works.tsx`,
`become-partner.tsx`, `layout/header.tsx`, `layout/footer.tsx`.

**Réaccordés aux nouveaux tokens**
`ui/button.tsx`, `ui/badge.tsx`, `ui/chip.tsx`, `ui/input.tsx`,
`ui/empty-state.tsx`, `restaurants/restaurant-card.tsx`,
`restaurants/vendor-card.tsx`, `restaurants/restaurants-filters.tsx`,
`restaurants/vendor-type-chips.tsx`, `restaurants/restaurant-hero.tsx`,
`restaurants/restaurant-menu.tsx`.

## 7. Gestion des cas dégradés

- **API vendeurs en échec** → la page reste affichée ; la section catalogue montre
  un état vide explicite avec un bouton « Réessayer ». Jamais de page blanche.
- **Image de vendeur manquante** → aplat crème portant l'initiale du vendeur, pas
  d'icône d'image cassée.
- **Catalogue vide** → les emplacements en pointillés du § 4.1 tiennent lieu d'état
  vide ; le message invite à revenir plus tard.

## 8. Découpage de l'implémentation

Les 41 composants ne changent pas d'un bloc. Quatre vagues, le site restant
fonctionnel après chacune :

1. **Tokens** — `globals.css`, polices, suppression du mode sombre et de toutes les
   classes `dark:`. Le site change de couleurs, la mise en page ne bouge pas.
2. **Home** — hero-slider avec sa règle de repli, catégories, catalogue, bande
   « comment ça marche », bloc partenaire, suppressions du § 4.1.
3. **Catalogue et fiche vendeur.**
4. **Reprise des composants `ui/`** et vérification des écrans qui héritent.

## 9. Vérification

- `pnpm turbo lint type-check build --filter=web` passe.
- `grep -rn "dark:" apps/web` ne renvoie plus rien — piège classique de la
  suppression d'un thème.
- `grep -rn "pravatar\|Fraunces" apps/web` ne renvoie plus rien.
- Contrôle visuel des trois pages refondues en **360, 768 et 1440 px**.
- Hero vérifié dans ses trois états : 0, 1 et 3+ vendeurs éligibles.
- Contrastes conformes au § 3.1 sur les boutons, le texte rouge et le texte sur
  photo.
