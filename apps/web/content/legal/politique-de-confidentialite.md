# Politique de Confidentialité — Lilia Food

> Document légal · Version 1.1 · Entrée en vigueur : 2026-05-19
> Dernière mise à jour : 2026-08-27
> Société : **Lilia Food** (en cours d'immatriculation au RCCM Brazzaville)
> Contact données personnelles : `contact@liliafood.com` · Support : `contact@liliafood.com`
>
> Ce document couvre le traitement des données personnelles par Lilia Food. Les règles d'usage de la plateforme (inscription, commandes, paiement, annulation, responsabilité...) font l'objet d'un document distinct : les **Conditions Générales d'Utilisation** (`conditions-generales-utilisation.md`).

---

## Préambule

Lilia Food est une plateforme de marketplace mettant en relation **clients**, **restaurants partenaires** et **livreurs indépendants** à Brazzaville (République du Congo), via les applications mobiles iOS/Android, le site web `lilia-food.cg` et le tableau de bord administrateur.

L'inscription, la connexion ou l'utilisation de la plateforme vaut acceptation **expresse et sans réserve** de la présente politique.

## 1. Responsable du traitement

| Élément | Information |
|---|---|
| Entité légale | Lilia Food |
| Siège social | Brazzaville, République du Congo |
| Représentant légal | Henok MIPOKA |
| Cadre légal applicable | Loi n° 29-2019 du 10 octobre 2019 portant protection des données à caractère personnel (République du Congo, Journal Officiel n°45-2019) |
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
- **Équipe Lilia Food (rôle ADMIN)** : accès complet pour support, modération, prévention fraude. Soumise à confidentialité contractuelle.

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
| **Réclamation** — saisir l'autorité compétente | Autorité de contrôle désignée en vertu de la Loi n° 29-2019 du 10 octobre 2019. Sa dénomination et ses coordonnées seront précisées ici dès confirmation de son caractère opérationnel (à valider avec un avocat congolais). |

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

## 12. Contact

| Sujet | Email |
|---|---|
| Données personnelles | `contact@liliafood.com` |
| Support client | `contact@liliafood.com` |
| Litiges et juridique | `contact@liliafood.com` |

Adresse postale (à publier au siège social définitif) : Lilia Food, Brazzaville, République du Congo.

---

## Historique des versions

| Version | Date | Modifications principales |
|---|---|---|
| 1.0 | 2026-05-19 | Version initiale (partie d'un document combiné avec les CGU) |
| 1.1 | 2026-08-27 | Séparée des CGU en document autonome. Ajout de la référence légale à la Loi n° 29-2019 du 10 octobre 2019 (protection des données à caractère personnel, Congo) aux sections 1 et 7. |

---

*Document généré à partir des Lilia Food Docs (architecture, business flows, paiements) et vérifié par recherche web pour la référence légale congolaise (Loi n° 29-2019). À faire valider par un avocat congolais avant publication officielle — en particulier pour confirmer l'autorité de contrôle compétente et compléter la raison sociale, le RCCM et le représentant légal une fois l'immatriculation finalisée.*
