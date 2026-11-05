# Conditions Générales d'Utilisation — Lilia Food

> Document légal · Version 1.2 · Entrée en vigueur : 2026-11-05
> Dernière mise à jour : 2026-11-05
> Société : **Lilia Food** (en cours d'immatriculation au RCCM Brazzaville)
> Contact légal : `contact@lilia-food.com` · Support : `contact@lilia-food.com`
>
> Le traitement de vos données personnelles est décrit dans un document distinct : la **Politique de Confidentialité** (`politique-de-confidentialite.md`). L'inscription, la connexion ou l'utilisation de la plateforme vaut acceptation **expresse et sans réserve** des deux documents.

---

## 1. Objet

Les présentes CGU régissent l'accès et l'usage des services Lilia Food, comprenant :

- Application mobile **Lilia Food** (clients, iOS + Android)
- Application mobile **Lilia Admin** (restaurateurs et équipe Lilia)
- Application mobile **Lilia Livreur** (livreurs partenaires)
- Site web `lilia-food.com` (clients + admin)

## 2. Qualification juridique

Lilia Food est une **plateforme de mise en relation** entre :

- **Clients** (consommateurs)
- **Restaurants partenaires** (vendeurs, indépendants juridiquement)
- **Livreurs partenaires** (prestataires de service, indépendants juridiquement)

Lilia Food **n'est pas vendeur** des plats ni transporteur de personnes. Elle facilite la commande, l'orchestration logistique et l'encaissement pour le compte des restaurants.

Le contrat de vente du plat est conclu directement entre le **client** et le **restaurant partenaire**.

## 3. Inscription & comptes

### 3.1 Conditions

- Avoir 18 ans révolus (ou être accompagné d'un représentant légal).
- Fournir des informations exactes et à jour.
- Un seul compte par personne physique (sauf comptes distincts client/livreur/resto pour un même individu, autorisés mais traités séparément).
- Téléphone valide localisé au Congo pour utiliser la plateforme à Brazzaville.

### 3.2 Sécurité du compte

L'utilisateur est responsable de la confidentialité de ses identifiants. Tout usage du compte est présumé fait par lui. En cas de soupçon de compromission, il doit **immédiatement** changer son mot de passe et contacter `contact@liliafood.com`.

### 3.3 Suspension et bannissement

Lilia se réserve le droit, après notification motivée :

- de **suspendre** un compte (lecture seule) pendant l'instruction d'un signalement,
- de **bannir** définitivement (`statusUser = BANNED`) un compte pour les motifs suivants :
  - fraude au paiement, à la promo ou au parrainage,
  - création de multi-comptes pour exploiter les offres "première commande",
  - propos injurieux, harcèlement, menace envers restos ou livreurs,
  - utilisation de la plateforme à des fins illégales,
  - 3 annulations de mauvaise foi en 30 jours.

L'utilisateur banni peut contester par email sous 30 jours.

## 4. Commande et paiement

### 4.1 Processus

1. **Sélection** : choisir un restaurant ouvert dans la zone de livraison.
2. **Panier** : composition libre tant que le sous-total atteint le minimum fixé par le resto.
3. **Checkout** : choix adresse, paiement (MTN MoMo / Airtel Money), code promo, points fidélité éventuels.
4. **Confirmation** : le client valide le récapitulatif et la commande est créée en statut `EN_ATTENTE`.

### 4.2 Calcul du prix total

```
Total = Sous-total
       + Frais de livraison (fixés par le restaurant, par zone)
       + Frais de service
       − Réduction code promo
       − Réduction points fidélité
```

Le montant de chaque ligne — dont les frais de service et la valeur des points utilisés — est affiché au récapitulatif avant la validation de la commande. Le montant débité est celui de ce récapitulatif.

### 4.3 Paiement

- Le paiement se fait exclusivement par Mobile Money (MTN MoMo ou Airtel Money). Le paiement à la livraison n'est pas proposé.
- Après validation de la commande, une demande de paiement est envoyée sur le téléphone du client, qui la confirme avec son code secret.
- La commande n'est considérée comme payée qu'après confirmation du paiement par l'opérateur. Tant que cette confirmation n'est pas reçue, la commande reste en attente de paiement et peut être payée à nouveau depuis son détail.
- En cas d'indisponibilité du paiement automatique, Lilia Food peut proposer un virement Mobile Money : le numéro, le montant et la référence sont alors affichés sur la commande, et un agent Lilia Food confirme la réception.

### 4.4 Devise et taxes

- Devise : **XAF (Franc CFA)** uniquement.
- Les prix affichés sont **TTC** (TVA incluse pour les restaurants assujettis).
- Frais de service Lilia : montant affiché au récapitulatif de commande.

## 5. Livraison

### 5.1 Engagements

- **Délai cible** : 60 minutes max, **engagement non garanti** (dépend trafic, météo, charge resto, distance).
- **Zone** : périmètre couvert défini dans l'app (quartiers de Brazzaville pré-définis). Hors-zone = commande impossible.
- **Suivi** : le client suit l'avancement de sa commande dans l'application et sur le site. Pendant la course, l'application mobile peut afficher la position du livreur.

### 5.2 Réception

- Le client doit être **joignable** au numéro fourni.
- Présence requise à l'adresse à l'arrivée du livreur.
- Si le client reste injoignable malgré le protocole de contact suivi par le livreur (appels répétés et attente sur place, à proximité de l'adresse), ou s'il refuse la commande à la livraison, la commande est déclarée en **échec de livraison** et n'est pas remboursée.
- Dans tout autre cas d'échec de livraison (adresse introuvable, incident du livreur, protocole de contact incomplet…), le client est remboursé.

### 5.3 Échec ou retard

| Situation | Recours |
|---|---|
| Retard > 30 min vs estimation | Contact support possible, geste commercial éventuel (points fidélité) |
| Client injoignable malgré le protocole de contact | Pas de remboursement (section 5.2) |
| Problème livreur (panne, accident) | Réassignation gratuite, dédommagement éventuel |
| Plat manquant ou erroné à réception | Signalement dans les 24h avec photo → remboursement partiel ou total |
| Plat de qualité non conforme | Avis + signalement → instruction Lilia + resto |

## 6. Annulation et remboursement

### 6.1 Droit du client

| Statut commande | Annulation possible ? | Remboursement |
|---|---|---|
| En attente de paiement | Oui, sans frais | Rien n'a été débité |
| Payée, acceptée ou en préparation | Non par le client : demande au support | Si la commande est annulée, remboursement de la totalité du montant encaissé |
| Prête ou en route | Non | — |
| Livrée | Réclamation dans l'app (section 5.3) | Au cas par cas |

### 6.2 Droit du vendeur

Un vendeur peut annuler une commande payée, avant le départ du livreur, pour motif valable (rupture de stock, fermeture imprévue). Une commande en route ne peut être annulée que par Lilia Food. Toute annulation d'une commande payée ouvre un remboursement de la **totalité** du montant encaissé.

### 6.3 Modalités du remboursement

- Par retour Mobile Money sur le numéro ayant servi au paiement, **sous 5 jours ouvrés**.

## 7. Programme de fidélité et parrainage

### 7.1 Points fidélité

- **Acquisition** : des points sont crédités pour les commandes livrées, selon le barème en vigueur affiché dans l'application.
- **Valeur** : la valeur d'un point en XAF est celle affichée dans l'application et au checkout au moment de son utilisation.
- **Utilisation** : à partir du seuil affiché dans l'application, applicables au checkout sur une prochaine commande.
- **Non-cumulables** avec certains codes promo spécifiques (mention explicite dans le code).
- **Non-monétisables** : aucun rachat en espèces.
- **Expiration** : 24 mois d'inactivité du compte (préavis 30j par email).

### 7.2 Parrainage

- Chaque utilisateur dispose d'un **code parrainage 8 caractères** auto-généré.
- Bonus de parrainage : des points sont crédités au parrain et, le cas échéant, au filleul après la première commande livrée du filleul, selon le barème en vigueur affiché dans l'application.
- **Anti-abus** : Lilia se réserve le droit d'annuler des bonus en cas de suspicion de fraude (multi-comptes, faux numéros).

### 7.3 Codes promo

- Soumis aux conditions affichées (date validité, minimum panier, premier achat, restaurant spécifique).
- Un seul code promo par commande.
- Lilia peut retirer un code à tout moment en cas d'abus avéré ou d'erreur d'affichage de prix.

## 8. Conditions spécifiques restaurateurs

Tout restaurant partenaire signe un **contrat de partenariat distinct**, complémentaire aux présentes CGU. Principes clés :

- Le restaurant définit librement ses prix, horaires, zone et minimum de commande.
- **Aucun frais d'inscription ou de démarrage** n'est actuellement facturé au restaurant pour rejoindre la plateforme.
- **Période d'essai gratuite** : tout nouveau restaurant partenaire bénéficie d'une semaine (7 jours) à compter de son activation sur la plateforme, sans commission ni frais Lilia sur les commandes reçues durant cette période.
- **Commission** : Lilia Food se réserve le droit d'appliquer une commission sur le sous-total des commandes à l'issue de la période d'essai. Le taux et la date d'entrée en vigueur ne sont pas fixés dans les présentes CGU : ils seront communiqués au restaurant avant toute application, et précisés dans le contrat de partenariat signé séparément avec chaque restaurant.
- Versement du chiffre d'affaires net **hebdomadaire** (mardi pour la semaine précédente) sur compte Mobile Money.
- Le restaurant garantit la conformité sanitaire des plats, le respect des règlements d'hygiène et la véracité de son catalogue (photos, ingrédients, prix).
- En cas de plainte sanitaire fondée, Lilia peut suspendre le restaurant et alerter les autorités.

## 9. Conditions spécifiques livreurs

Tout livreur partenaire signe un **contrat de prestation de service** distinct. Principes clés :

- Statut : **indépendant** (pas employé Lilia).
- Rémunération : forfait par course + bonus (heures de pointe, météo).
- Versement **hebdomadaire** sur Mobile Money.
- Obligation d'assurance personnelle (véhicule + RC pro).
- Tenue Lilia (sac isotherme) fournie en caution.
- Respect du code de la route et de la courtoisie client.
- Notation min. 4.0/5 à maintenir sur 30 jours, sous peine d'avertissement puis désactivation.

## 10. Comportement de l'utilisateur

L'utilisateur s'engage à ne pas :

- créer de comptes multiples pour exploiter promos "première commande",
- partager publiquement des codes promo internes,
- exercer pression ou menace envers livreurs/restaurateurs,
- publier des avis mensongers, diffamatoires, ou rémunérés par tiers,
- tenter de pirater, scraper ou rétro-ingéniérer la plateforme,
- utiliser la plateforme à des fins illégales (blanchiment, achats de substances illicites, etc.).

## 11. Propriété intellectuelle

- Marque, logo, design Lilia Food = propriété exclusive Lilia Food SARL.
- Logiciel (apps, backend, web) = sous licence d'usage personnel et non transférable.
- Photos plats et catalogues = propriété du restaurant partenaire respectif, partagées avec Lilia pour exploitation sur la plateforme.
- Avis et photos publiés par l'utilisateur = l'utilisateur conserve la propriété, mais accorde à Lilia une licence mondiale, gratuite et non-exclusive d'usage promotionnel.

## 12. Responsabilité

### 12.1 Lilia Food

- Lilia s'engage à fournir le service avec diligence, sans pour autant en garantir une disponibilité ininterrompue (maintenance, incidents tiers : MoMo, Firebase, etc.).
- Lilia n'est **pas responsable** :
  - de la qualité gustative ou sanitaire des plats (responsabilité du restaurant),
  - des retards causés par météo, trafic, incidents livreur,
  - des litiges entre client et restaurant pour des choses non liées à la livraison (allergies non signalées, par exemple),
  - de pertes indirectes (préjudice d'image, manque à gagner pour rdv professionnel raté).

### 12.2 Plafond

La responsabilité de Lilia, toutes causes confondues, est plafonnée au **montant de la commande litigieuse** (hors cas de force majeure, fraude ou faute lourde).

### 12.3 Force majeure

Conformément au droit congolais, sont considérés comme cas de force majeure exonérant Lilia : catastrophes naturelles, conflits, pandémies, coupures généralisées d'électricité ou télécoms, sanctions internationales touchant un prestataire critique.

## 13. Litiges et médiation

### 13.1 Procédure amiable

Toute réclamation doit en premier lieu être adressée à **support@lilia-food.cg** avec description et pièces jointes. Lilia s'engage à répondre sous **5 jours ouvrés**.

### 13.2 Médiation

À défaut d'accord amiable, et avant toute action judiciaire, les parties s'engagent à recourir à une médiation (organisme à désigner, par exemple Chambre de Commerce de Brazzaville).

### 13.3 Juridiction

À défaut d'accord, **les tribunaux compétents de Brazzaville** sont seuls compétents. Le droit applicable est le droit congolais.

## 14. Dispositions générales

- **Nullité partielle** : si une clause est jugée nulle, les autres demeurent applicables.
- **Tolérance** : ne pas exercer un droit ne vaut pas renonciation à ce droit.
- **Cession** : Lilia peut céder le contrat dans le cadre d'une opération de fusion / acquisition, sous réserve d'information préalable de l'utilisateur.
- **Notifications** : valides par email à l'adresse renseignée + bannière in-app.

## 15. Contact

| Sujet | Email |
|---|---|
| Support client | `contact@liliafood.com` |
| Litiges et juridique | `legal@liliafood.com` |
| Partenariats restos | `contact@liliafood.com` |
| Livreurs | `contact@liliafood.com` |
| Presse | `contact@liliafood.com` |

Adresse postale (à publier au siège social définitif) : Lilia Food, Brazzaville, République du Congo.

---

## Historique des versions

| Version | Date | Modifications principales |
|---|---|---|
| 1.0 | 2026-05-19 | Version initiale (partie d'un document combiné avec la politique de confidentialité) |
| 1.1 | 2026-08-27 | Séparée de la politique de confidentialité en document autonome. Section 8 (restaurateurs) réécrite : suppression du forfait de démarrage, ajout de la période d'essai gratuite d'une semaine, commission reportée et non chiffrée dans ce document. |
| 1.2 | 2026-11-05 | Frais de service, valeur et seuil des points, barème de fidélité et bonus de parrainage renvoyés au récapitulatif et à l'application plutôt que chiffrés. Paiement décrit tel qu'il fonctionne (demande Mobile Money automatique, confirmation par l'opérateur, pas de paiement à la livraison). Annulation et remboursement alignés : le client annule avant paiement ; après paiement, l'annulation passe par le support ou le vendeur et ouvre le remboursement de la totalité du montant encaissé. Échec de livraison : cas de non-remboursement précisés. Avoir majoré retiré. |
