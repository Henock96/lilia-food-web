# Politique de Confidentialité & Conditions Générales d'Utilisation — Lilia Food

> Document légal · Version 1.0 · Entrée en vigueur : 2026-05-19
> Dernière mise à jour : 2026-05-19
> Société : **Lilia Food** (en cours d'immatriculation au RCCM Brazzaville)
> Contact légal : `legal@lilia-food.cg` · Support : `contact@liliafood.com`

---

## Préambule

Lilia Food est une plateforme de marketplace mettant en relation **clients**, **restaurants partenaires** et **livreurs indépendants** à Brazzaville (République du Congo), via les applications mobiles iOS/Android, le site web `liliafood.com` et le tableau de bord administrateur.

Le présent document couvre **deux volets** indissociables :

- **Partie A — Politique de Confidentialité** : traitement des données personnelles.
- **Partie B — Conditions Générales d'Utilisation (CGU)** : règles d'usage de la plateforme.

L'inscription, la connexion ou l'utilisation de la plateforme vaut acceptation **expresse et sans réserve** de ces conditions.

---

# PARTIE A — POLITIQUE DE CONFIDENTIALITÉ

## 1. Responsable du traitement

| Élément | Information |
|---|---|
| Entité légale | Lilia Food SARL |
| Siège social | Brazzaville, République du Congo |
| Représentant légal | À compléter (gérant) |
| Email contact données | `contact@liliafood.com` |
| Délégué à la protection des données (DPO) | Désigné lors de l'expansion régionale (Q1 2027) |

## 2. Données collectées

### 2.1 Données fournies par l'utilisateur

| Catégorie | Détail | Base légale |
|---|---|---|
| Identité | Nom, prénom, date de naissance (optionnel) | Exécution du contrat |
| Contact | Email, numéro de téléphone | Exécution du contrat |
| Authentification | Compte Firebase (email/Google), mot de passe haché chez Firebase | Exécution du contrat |
| Adresses de livraison | Quartier, rue, point de repère, coordonnées GPS | Exécution du contrat |
| Préférences | Restaurants favoris, code parrainage utilisé, préférences alimentaires | Intérêt légitime |
| Photos | Photo de profil (optionnel), photos pour avis (optionnel) | Consentement |

### 2.2 Données collectées automatiquement

| Catégorie | Détail | Conservation |
|---|---|---|
| Données de commande | Historique commandes, montants, items, restaurants, livreurs assignés | 5 ans (obligation comptable) |
| Données de paiement | Méthode (MTN MoMo / Airtel Money), montant, référence transaction, statut. **Aucun identifiant bancaire complet n'est stocké.** | 10 ans (obligation fiscale Congo) |
| Géolocalisation | Position GPS lors de la livraison (côté client et livreur), précision ~10m | 30 jours après livraison |
| Données techniques | IP, modèle d'appareil, version OS, version app, identifiant FCM (push), crashs | 12 mois |
| Cookies / SDK | Firebase Analytics, Firebase Crashlytics, identifiants publicitaires anonymes | 13 mois max |
| Logs serveur | Requêtes API (sans corps), latences, erreurs | 90 jours |

### 2.3 Données spécifiques aux livreurs

| Catégorie | Détail |
|---|---|
| Identité étendue | Pièce d'identité (CNI ou passeport), numéro CNI |
| Véhicule | Type (moto, vélo, voiture), plaque |
| Bancaire | Numéro Mobile Money pour versement gains |
| Activité | Historique missions, notations clients, statut (AVAILABLE/ON_DELIVERY/OFFLINE), positions GPS en service |

### 2.4 Données spécifiques aux restaurateurs

| Catégorie | Détail |
|---|---|
| Établissement | Raison sociale, registre commerce, adresse complète, horaires |
| Bancaire | Numéro Mobile Money pour versement chiffre d'affaires |
| Catalogue | Produits, prix, photos, descriptions |
| Activité | Commandes reçues, chiffre d'affaires, notations |

## 3. Finalités du traitement

| Finalité | Données concernées | Base légale |
|---|---|---|
| Création et gestion du compte | Identité, contact, auth | Contrat |
| Traitement des commandes | Toutes données commande + livraison + paiement | Contrat |
| Mise en relation client / resto / livreur | Adresse, GPS, contact | Contrat |
| Notifications transactionnelles (push, SMS, email) | Token FCM, téléphone, email | Contrat |
| Programme de fidélité et parrainage | Historique commandes, code parrainage | Contrat |
| Service client et résolution litiges | Historique conversations + commandes | Intérêt légitime |
| Prévention fraude (codes promo, doublons, abus) | Logs, IP, comportements | Intérêt légitime |
| Amélioration produit (analytics anonymisés) | Données techniques et d'usage agrégées | Intérêt légitime |
| Communications marketing (newsletters, promos) | Email, téléphone, préférences | **Consentement explicite** (opt-in) |
| Obligations légales et comptables | Commandes, paiements, factures | Obligation légale |

## 4. Destinataires des données

### 4.1 Au sein de l'écosystème Lilia Food

- **Restaurateurs partenaires** : reçoivent prénom client, contact téléphone, adresse de livraison et items commandés (uniquement pour leurs commandes).
- **Livreurs indépendants** : reçoivent prénom, téléphone et adresse de livraison du client (uniquement pour leurs missions, accès révoqué après livraison).
- **Équipe Lilia (rôle ADMIN)** : accès complet pour support, modération, prévention fraude. Soumise à confidentialité contractuelle.

### 4.2 Sous-traitants techniques (data processors)

| Prestataire | Rôle | Pays hébergement | Mesures |
|---|---|---|---|
| **Firebase (Google LLC)** | Authentification, push FCM, analytics, crash reporting | USA / UE | Clauses contractuelles types Google |
| **Render** | Hébergement backend API + base PostgreSQL | USA (Oregon) | Chiffrement transit + au repos |
| **Cloudinary** | Stockage images (photos produits, avis, profils) | USA / UE | URLs signées, transformations server-side |
| **MTN MoMo / Airtel Money** | Traitement paiements mobile money | Congo | Conforme régulation locale |
| **Mailtrap** | Emails transactionnels | UE | Conforme RGPD |
| **Google Maps Platform** | Géocodage, cartes | USA / UE | API key restreintes |
| **Vercel** | Hébergement front web | USA / UE | CDN edge global |

Chaque sous-traitant intervient sur instruction de Lilia Food, avec un contrat de sous-traitance précisant la portée et la sécurité.

### 4.3 Tiers obligatoires

- **Autorités judiciaires ou administratives** sur réquisition légale.
- **Avocats, comptables, assureurs** dans le cadre d'un litige ou contrôle.

**Lilia Food ne revend jamais vos données à des tiers à des fins commerciales.**

## 5. Transferts internationaux

Certaines données peuvent être hébergées hors du Congo (USA, UE). Lilia s'assure que ces transferts s'appuient sur des garanties contractuelles équivalentes (clauses types ou équivalents) et privilégie, lorsque disponible, des régions plus proches (UE, Afrique).

## 6. Durées de conservation

| Donnée | Durée active | Archivage | Suppression |
|---|---|---|---|
| Compte actif | Tant que le compte existe | — | Sur demande ou inactivité > 36 mois |
| Commandes (comptable) | 5 ans actif | 5 ans archive | 10 ans total |
| Paiements (fiscal) | 10 ans | — | 10 ans |
| Géolocalisation livraison | 30 jours | — | Anonymisation après 30j |
| Logs techniques | 90 jours | — | Purge automatique |
| Tokens FCM | Tant que valides | — | Suppression dès retour `InvalidRegistration` |
| Cookies analytics | 13 mois max | — | Renouvellement consentement |
| Données livreur après désactivation | 12 mois (litiges) | 5 ans (fiscal) | Anonymisation post 5 ans |

## 7. Vos droits

Vous disposez à tout moment, et sans frais, des droits suivants :

| Droit | Comment l'exercer |
|---|---|
| **Accès** — obtenir une copie de vos données | Email à `privacy@lilia-food.cg` |
| **Rectification** — corriger des informations | Directement dans l'app (profil) ou par email |
| **Effacement** — supprimer votre compte | Bouton "Supprimer mon compte" (Profil > Confidentialité) ou email |
| **Limitation** — restreindre l'usage | Email avec motif |
| **Opposition** — refuser un traitement (notamment marketing) | Désinscription dans chaque email + paramètres app |
| **Portabilité** — récupérer vos données dans un format lisible | Email, fournit JSON/CSV sous 30 jours |
| **Retrait du consentement** — pour les traitements basés sur consentement | À tout moment, sans rétroactivité |
| **Réclamation** — saisir l'autorité compétente | Autorité de protection des données Congo (à venir) |

**Délai de réponse Lilia** : 1 mois maximum (prolongeable à 2 mois pour demandes complexes).

### Cas de la suppression de compte

La suppression d'un compte client entraîne :
- Suppression immédiate de l'accès et des données de profil.
- **Anonymisation** (pas suppression) des commandes passées : nécessaire pour obligation comptable. Le compte n'est plus rattaché nominalement.
- Conservation 10 ans des paiements (obligation fiscale).

## 8. Sécurité

Mesures techniques et organisationnelles :

- **Chiffrement en transit** : TLS 1.3 sur toutes les communications API et WebSocket.
- **Chiffrement au repos** : base PostgreSQL chiffrée côté hébergeur.
- **Authentification** : Firebase Authentication (mots de passe jamais stockés en clair côté Lilia).
- **Aucune carte bancaire stockée** : tous les paiements transitent par MTN MoMo ou Airtel Money. Lilia ne voit jamais de numéro de carte.
- **Rate limiting** : protection contre les attaques par force brute (10 req/s, 100 req/min par IP).
- **Idempotency-Key** : protection contre les doublons de commande en réseau instable.
- **Cloisonnement rôles** : CLIENT, RESTAURATEUR, LIVREUR, ADMIN avec permissions strictes.
- **Journalisation** : logs serveur 90 jours pour traçabilité forensic.
- **Mises à jour de sécurité** : dépendances surveillées en continu, patchs appliqués sous 7 jours pour CVE critiques.
- **Monitoring** : Sentry en cours de déploiement (cf. roadmap Q3 2026).

### En cas de violation de données

Lilia Food s'engage à notifier les utilisateurs concernés **sous 72 heures** après prise de connaissance, et à communiquer publiquement si plus de 1 000 utilisateurs sont touchés.

## 9. Mineurs

La plateforme s'adresse aux personnes de **18 ans révolus** ou aux mineurs accompagnés d'un représentant légal qui paie. Aucune donnée n'est sciemment collectée auprès de mineurs de moins de 13 ans. Tout signalement entraîne suppression immédiate.

## 10. Cookies & traceurs

Le site `lilia-food.cg` et les applications mobiles utilisent :

| Catégorie | Outils | Désactivable ? |
|---|---|---|
| **Strictement nécessaires** | Session Firebase, panier, préférences | Non (fonctionnement de la plateforme) |
| **Mesure d'audience** | Firebase Analytics (anonymisé) | Oui (paramètres app) |
| **Crash et performance** | Firebase Crashlytics, Sentry | Oui (paramètres app) |
| **Marketing** | Pixels Meta (à venir) | Oui (consentement requis) |

Un bandeau de consentement est affiché lors de la première visite web. L'utilisateur peut modifier ses choix à tout moment dans **Profil > Confidentialité**.

## 11. Modifications de la politique

Lilia Food peut faire évoluer cette politique pour suivre l'évolution de la plateforme ou de la réglementation. Toute modification substantielle est notifiée :

- Par email à tous les utilisateurs actifs (30 jours d'avance pour les changements majeurs).
- Par bannière in-app au lancement.
- Mise à jour de la date "dernière mise à jour" en haut du document.

Le maintien de l'usage après notification vaut acceptation.

---

# PARTIE B — CONDITIONS GÉNÉRALES D'UTILISATION

## 12. Objet

Les présentes CGU régissent l'accès et l'usage des services Lilia Food, comprenant :

- Application mobile **Lilia Food** (clients, iOS + Android)
- Application mobile **Lilia Admin** (restaurateurs et équipe Lilia)
- Application mobile **Lilia Livreur** (livreurs partenaires)
- Site web `lilia-food.cg` (clients + admin)

## 13. Qualification juridique

Lilia Food est une **plateforme de mise en relation** entre :

- **Clients** (consommateurs)
- **Restaurants partenaires** (vendeurs, indépendants juridiquement)
- **Livreurs partenaires** (prestataires de service, indépendants juridiquement)

Lilia Food **n'est pas vendeur** des plats ni transporteur de personnes. Elle facilite la commande, l'orchestration logistique et l'encaissement pour le compte des restaurants.

Le contrat de vente du plat est conclu directement entre le **client** et le **restaurant partenaire**.

## 14. Inscription & comptes

### 14.1 Conditions

- Avoir 18 ans révolus (ou être accompagné d'un représentant légal).
- Fournir des informations exactes et à jour.
- Un seul compte par personne physique (sauf comptes distincts client/livreur/resto pour un même individu, autorisés mais traités séparément).
- Téléphone valide localisé au Congo pour utiliser la plateforme à Brazzaville.

### 14.2 Sécurité du compte

L'utilisateur est responsable de la confidentialité de ses identifiants. Tout usage du compte est présumé fait par lui. En cas de soupçon de compromission, il doit **immédiatement** changer son mot de passe et contacter `support@lilia-food.cg`.

### 14.3 Suspension et bannissement

Lilia se réserve le droit, après notification motivée :

- de **suspendre** un compte (lecture seule) pendant l'instruction d'un signalement,
- de **bannir** définitivement (`statusUser = BANNED`) un compte pour les motifs suivants :
  - fraude au paiement, à la promo ou au parrainage,
  - création de multi-comptes pour exploiter les offres "première commande",
  - propos injurieux, harcèlement, menace envers restos ou livreurs,
  - utilisation de la plateforme à des fins illégales,
  - 3 annulations de mauvaise foi en 30 jours.

L'utilisateur banni peut contester par email sous 30 jours.

## 15. Commande et paiement

### 15.1 Processus

1. **Sélection** : choisir un restaurant ouvert dans la zone de livraison.
2. **Panier** : composition libre tant que le sous-total atteint le minimum fixé par le resto.
3. **Checkout** : choix adresse, paiement (MTN MoMo / Airtel Money), code promo, points fidélité éventuels.
4. **Confirmation** : le client valide le récapitulatif et la commande est créée en statut `EN_ATTENTE`.

### 15.2 Calcul du prix total

```
Total = Sous-total
       + Frais de livraison (fixés par le restaurant, par zone)
       + Frais de service (8% du sous-total)
       − Réduction code promo
       − Réduction points fidélité (1 point = 5 XAF, minimum 100 points)
```

### 15.3 Paiement

**Mode actuel : MANUAL (Mobile Money)**

- Le client transfère le montant exact via MTN MoMo ou Airtel Money sur le numéro Lilia communiqué dans l'app.
- Il signale le paiement dans l'app (référence transaction).
- L'équipe Lilia **valide manuellement** (délai cible : moins de 10 minutes en heures ouvrées).
- Une notification confirme la validation et déclenche la commande.

**Mode futur : MTN PRODUCTION automatique** (cf. roadmap Q4 2026). Une fois activé, le paiement sera prélevé via prompt MTN sur le téléphone du client après confirmation.

### 15.4 Devise et taxes

- Devise : **XAF (Franc CFA)** uniquement.
- Les prix affichés sont **TTC** (TVA incluse pour les restaurants assujettis).
- Frais de service Lilia : 8% du sous-total, **non remboursables** en cas d'annulation après validation paiement.

## 16. Livraison

### 16.1 Engagements

- **Délai cible** : 60 minutes max, **engagement non garanti** (dépend trafic, météo, charge resto, distance).
- **Zone** : périmètre couvert défini dans l'app (quartiers de Brazzaville pré-définis). Hors-zone = commande impossible.
- **Suivi temps réel** : à partir du statut `EN_ROUTE`, le client visualise le livreur sur la carte.

### 16.2 Réception

- Le client doit être **joignable** au numéro fourni.
- Présence requise à l'adresse à l'arrivée du livreur.
- **3 tentatives** de contact sans réponse → la commande passe en `ECHEC`, sans remboursement automatique (étude au cas par cas).
- Refus du client à la livraison : la commande est marquée échouée, traitement support pour remboursement éventuel sous conditions.

### 16.3 Échec ou retard

| Situation | Recours |
|---|---|
| Retard > 30 min vs estimation | Contact support possible, geste commercial éventuel (points fidélité) |
| Client absent malgré 3 appels | Pas de remboursement automatique, traitement support |
| Problème livreur (panne, accident) | Réassignation gratuite, dédommagement éventuel |
| Plat manquant ou erroné à réception | Signalement dans les 24h avec photo → remboursement partiel ou total |
| Plat de qualité non conforme | Avis + signalement → instruction Lilia + resto |

## 17. Annulation et remboursement

### 17.1 Droit du client

| Statut commande | Annulation possible ? | Remboursement |
|---|---|---|
| `EN_ATTENTE` (avant paiement validé) | Oui, sans frais | N/A |
| `PAYER` (paiement validé, resto pas encore accepté) | Oui, gratuite si dans les 2 min, sinon frais de service retenus | Total moins frais service |
| `EN_PREPARATION` | Non par le client (resto a commencé) | — |
| `PRET` / `EN_ROUTE` | Non | — |
| `LIVRER` | Litige post-livraison → procédure section 16.3 | Au cas par cas |

### 17.2 Droit du restaurateur

Un restaurateur peut annuler une commande en statut `PAYER` ou `EN_PREPARATION` pour motif valable (rupture stock, fermeture imprévue) → remboursement **intégral** au client + signalement Lilia.

### 17.3 Modalités du remboursement

- Par retour Mobile Money sur le numéro ayant servi au paiement, **sous 5 jours ouvrés**.
- Ou en **avoir Lilia** (points fidélité majorés de 20%), au choix du client.

## 18. Programme de fidélité et parrainage

### 18.1 Points fidélité

- **Acquisition** : 1 point pour chaque tranche de 100 XAF de sous-total commandé et livré.
- **Valeur** : 1 point = 5 XAF de réduction.
- **Utilisation** : minimum 100 points, applicables au checkout sur la prochaine commande.
- **Non-cumulables** avec certains codes promo spécifiques (mention explicite dans le code).
- **Non-monétisables** : aucun rachat en espèces.
- **Expiration** : 24 mois d'inactivité du compte (préavis 30j par email).

### 18.2 Parrainage

- Chaque utilisateur dispose d'un **code parrainage 8 caractères** auto-généré.
- Bonus parrain : **+500 points** à la première commande livrée du filleul.
- Bonus filleul : **+300 points** à sa première commande livrée.
- **Anti-abus** : Lilia se réserve le droit d'annuler des bonus en cas de suspicion de fraude (multi-comptes, faux numéros).

### 18.3 Codes promo

- Soumis aux conditions affichées (date validité, minimum panier, premier achat, restaurant spécifique).
- Un seul code promo par commande.
- Lilia peut retirer un code à tout moment en cas d'abus avéré ou d'erreur d'affichage de prix.

## 19. Conditions spécifiques restaurateurs

Tout restaurant partenaire signe un **contrat de partenariat distinct**, complémentaire aux présentes CGU. Principes clés :

- Le restaurant définit librement ses prix, horaires, zone et minimum de commande.
- Lilia prélève une **commission de 8%** (sur sous-total) + frais éventuels MoMo.
- Versement du chiffre d'affaires net **hebdomadaire** (mardi pour la semaine précédente) sur compte Mobile Money.
- Le restaurant garantit la conformité sanitaire des plats, le respect des règlements d'hygiène et la véracité de son catalogue (photos, ingrédients, prix).
- En cas de plainte sanitaire fondée, Lilia peut suspendre le restaurant et alerter les autorités.

## 20. Conditions spécifiques livreurs

Tout livreur partenaire signe un **contrat de prestation de service** distinct. Principes clés :

- Statut : **indépendant** (pas employé Lilia).
- Rémunération : forfait par course + bonus (heures de pointe, météo).
- Versement **hebdomadaire** sur Mobile Money.
- Obligation d'assurance personnelle (véhicule + RC pro).
- Tenue Lilia (sac isotherme) fournie en caution.
- Respect du code de la route et de la courtoisie client.
- Notation min. 4.0/5 à maintenir sur 30 jours, sous peine d'avertissement puis désactivation.

## 21. Comportement de l'utilisateur

L'utilisateur s'engage à ne pas :

- créer de comptes multiples pour exploiter promos "première commande",
- partager publiquement des codes promo internes,
- exercer pression ou menace envers livreurs/restaurateurs,
- publier des avis mensongers, diffamatoires, ou rémunérés par tiers,
- tenter de pirater, scraper ou rétro-ingéniérer la plateforme,
- utiliser la plateforme à des fins illégales (blanchiment, achats de substances illicites, etc.).

## 22. Propriété intellectuelle

- Marque, logo, design Lilia Food = propriété exclusive Lilia Food SARL.
- Logiciel (apps, backend, web) = sous licence d'usage personnel et non transférable.
- Photos plats et catalogues = propriété du restaurant partenaire respectif, partagées avec Lilia pour exploitation sur la plateforme.
- Avis et photos publiés par l'utilisateur = l'utilisateur conserve la propriété, mais accorde à Lilia une licence mondiale, gratuite et non-exclusive d'usage promotionnel.

## 23. Responsabilité

### 23.1 Lilia Food

- Lilia s'engage à fournir le service avec diligence, sans pour autant en garantir une disponibilité ininterrompue (maintenance, incidents tiers : MoMo, Firebase, etc.).
- Lilia n'est **pas responsable** :
  - de la qualité gustative ou sanitaire des plats (responsabilité du restaurant),
  - des retards causés par météo, trafic, incidents livreur,
  - des litiges entre client et restaurant pour des choses non liées à la livraison (allergies non signalées, par exemple),
  - de pertes indirectes (préjudice d'image, manque à gagner pour rdv professionnel raté).

### 23.2 Plafond

La responsabilité de Lilia, toutes causes confondues, est plafonnée au **montant de la commande litigieuse** (hors cas de force majeure, fraude ou faute lourde).

### 23.3 Force majeure

Conformément au droit congolais, sont considérés comme cas de force majeure exonérant Lilia : catastrophes naturelles, conflits, pandémies, coupures généralisées d'électricité ou télécoms, sanctions internationales touchant un prestataire critique.

## 24. Litiges et médiation

### 24.1 Procédure amiable

Toute réclamation doit en premier lieu être adressée à **support@lilia-food.cg** avec description et pièces jointes. Lilia s'engage à répondre sous **5 jours ouvrés**.

### 24.2 Médiation

À défaut d'accord amiable, et avant toute action judiciaire, les parties s'engagent à recourir à une médiation (organisme à désigner, par exemple Chambre de Commerce de Brazzaville).

### 24.3 Juridiction

À défaut d'accord, **les tribunaux compétents de Brazzaville** sont seuls compétents. Le droit applicable est le droit congolais.

## 25. Dispositions générales

- **Nullité partielle** : si une clause est jugée nulle, les autres demeurent applicables.
- **Tolérance** : ne pas exercer un droit ne vaut pas renonciation à ce droit.
- **Cession** : Lilia peut céder le contrat dans le cadre d'une opération de fusion / acquisition, sous réserve d'information préalable de l'utilisateur.
- **Notifications** : valides par email à l'adresse renseignée + bannière in-app.

## 26. Contact

| Sujet | Email |
|---|---|
| Support client | `support@lilia-food.cg` |
| Données personnelles | `privacy@lilia-food.cg` |
| Litiges et juridique | `legal@lilia-food.cg` |
| Partenariats restos | `partners@lilia-food.cg` |
| Livreurs | `drivers@lilia-food.cg` |
| Presse | `press@lilia-food.cg` |

Adresse postale (à publier au siège social définitif) : Lilia Food SARL, Brazzaville, République du Congo.

---

## Historique des versions

| Version | Date | Modifications principales |
|---|---|---|
| 1.0 | 2026-05-19 | Version initiale (lancement officiel plateforme) |

---

*Document généré à partir des Lilia Food Docs (architecture, business flows, paiements). À faire valider par un avocat congolais avant publication officielle. Adapter raison sociale + RCCM + représentant légal une fois immatriculation finalisée.*
