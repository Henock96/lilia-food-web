// --- Enums ---
export type Role = 'ADMIN' | 'RESTAURATEUR' | 'LIVREUR' | 'CLIENT';
export type StatusUser = 'INACTIVE' | 'ACTIVE' | 'BLOCKED' | 'DELETED';
export type VehicleType = 'MOTO' | 'VELO' | 'VOITURE' | 'PIETON';
export type OrderStatus =
  | 'EN_ATTENTE'
  | 'PAYER'
  /** Acceptée par le vendeur, pas encore en préparation (Phase 3, F3-01). */
  | 'ACCEPTEE'
  | 'EN_PREPARATION'
  | 'PRET'
  | 'EN_ROUTE'
  | 'LIVRER'
  | 'ANNULER'
  /** Terminal : le repas est parti et n'est pas arrivé (F3-05). */
  | 'ECHEC_LIVRAISON';

/**
 * Geste qu'une interface peut proposer sur une commande, publié par le
 * serveur dans `allowedActions` (règle R1, Phase 3). Les interfaces ne
 * recopient plus la matrice de transitions.
 */
export type OrderAction =
  | 'ACCEPT'
  | 'REJECT'
  | 'START_PREPARATION'
  | 'MARK_READY'
  | 'HAND_OVER'
  | 'CANCEL'
  /** Client, retrait : « J'ai récupéré ma commande » (F3-07). */
  | 'CONFIRM_PICKUP';

/**
 * Comment la remise d'une commande est prouvée (F3-07). C'est la preuve, et
 * non le statut `LIVRER`, qui dit si le vendeur peut être payé sans geste
 * humain : `PICKUP_VENDOR_DECLARED` et `DELIVERY_UNVERIFIED` ne le permettent
 * pas.
 */
export type DeliveryProof =
  | 'DELIVERY_CODE'
  | 'DELIVERY_ADMIN_OVERRIDE'
  | 'DELIVERY_UNVERIFIED'
  | 'PICKUP_CODE'
  | 'PICKUP_CUSTOMER_CONFIRMED'
  | 'PICKUP_ADMIN_OVERRIDE'
  | 'PICKUP_VENDOR_DECLARED';

/** Motif d'un refus vendeur — liste fermée, identique à l'enum serveur. */
export type VendorRejectionReason =
  | 'OUT_OF_STOCK'
  | 'TOO_BUSY'
  | 'CLOSING'
  | 'OUT_OF_ZONE'
  | 'OTHER';
/**
 * Opérateur choisi par le client pour payer.
 *
 * ⚠️ `CASH_ON_DELIVERY` a été retiré : la valeur n'existe plus dans l'enum
 * Prisma depuis la migration `20260515000000_remove_cash_on_delivery`. La
 * garder ici obligeait chaque `Record<PaymentMethod, …>` à inventer un libellé
 * et une couleur pour un mode qui n'est jamais servi, et laissait croire qu'on
 * pouvait le proposer.
 *
 * Les opérateurs réellement proposables viennent de `GET /payments/providers`,
 * qui porte aussi leur disponibilité du moment — un opérateur en panne est
 * grisé sans publier de release.
 */
export type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
/**
 * Cycle de vie d'une course.
 *
 * ⚠️ `ACCEPTER` manquait ici. Il a été ajouté côté backend le 29/08/2026 pour
 * distinguer « le livreur a pris la course et va au restaurant » de « il roule
 * avec le repas » — la confusion des deux faisait annoncer au client « votre
 * livreur est en chemin » alors que le livreur n'avait pas quitté son domicile.
 *
 * `lilia_food_delivery` avait le même trou : sa valeur inconnue retombait
 * silencieusement sur `EN_ATTENTE` et rendait invisible la carte de toute
 * course acceptée. Le corriger ici évite d'avoir à le découvrir une troisième
 * fois.
 *
 * `EN_ATTENTE` (course créée, aucun livreur) → `ASSIGNER` (un livreur est
 * désigné, il n'a pas répondu) → `ACCEPTER` (il a pris la course) →
 * `EN_TRANSIT` (il a le repas) → `LIVRER`. `ECHEC` est une sortie latérale.
 */
export type DeliveryStatus =
  | 'EN_ATTENTE'
  | 'ASSIGNER'
  | 'ACCEPTER'
  | 'EN_TRANSIT'
  | 'LIVRER'
  | 'ECHEC';

/**
 * Une ligne du classement des vendeurs (`GET /dashboard/restaurant-ranking`).
 *
 * ⚠️ `totalRevenue` somme `Order.total` sur les commandes non annulées — donc
 * `EN_ATTENTE` comprises, c'est-à-dire des commandes jamais payées. C'est le
 * défaut D-1 de l'audit, traité séparément côté serveur : la population et le
 * périmètre sont désormais justes, la définition du CA ne l'est pas encore.
 */
export interface RestaurantRankingRow {
  id: string;
  nom: string;
  imageUrl: string | null;
  isActive: boolean;
  orderCount: number;
  totalRevenue: number;
}

/** Les trois états qui composent une commande « bloquée ». */
export type StuckOrderStatus = 'PAYER' | 'ACCEPTEE' | 'EN_PREPARATION' | 'PRET';

/**
 * Décompte des commandes bloquées (`GET /orders/restaurant/stuck`).
 *
 * `oldestMinutes` vaut `null` — et non `0` — quand rien n'est bloqué : zéro se
 * lirait comme « une commande vient de se bloquer ».
 */
export interface StuckOrders {
  thresholdMinutes: number;
  total: number;
  byStatus: Record<StuckOrderStatus, number>;
  oldestMinutes: number | null;
}

/**
 * Cycle de vie d'un remboursement client.
 *
 * ⚠️ Un remboursement est une **dette suivie**, pas un mouvement d'argent :
 * `COMPLETED` signifie « quelqu'un a envoyé l'argent », pas « le système l'a
 * envoyé ». Aucun appel prestataire n'est déclenché — le virement se fait hors
 * application. L'interface doit le dire, sans quoi « Marquer remboursé » se lit
 * comme un ordre de paiement.
 */
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

/** Une ligne de la file des remboursements (`GET /refunds`). */
export interface Refund {
  id: string;
  orderId: string;
  paymentId: string | null;
  /** Montant dû au client, en XAF. Il vaut ce qui a été **réellement encaissé**. */
  amount: number;
  status: RefundStatus;
  /** Pourquoi la dette existe — écrit par le système à l'annulation. */
  reason: string;
  /** Ce que l'administrateur a noté en la traitant. */
  notes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** F3-06 — motif codé ; les quatre premiers sont des remboursements totaux automatiques. */
  reasonCode?: RefundReasonCode;
  /** F3-06 — qui supporte la perte. */
  bearer?: RefundBearer;
  incidentId?: string | null;
  /** F3-06 — vide = remboursement total (historique ou automatique). */
  lines?: RefundLine[];
  order?: {
    id: string;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    contactPhone: string | null;
    user: { id: string; nom: string | null; phone: string | null } | null;
    restaurant: { id: string; nom: string } | null;
  };
}

// --- Remboursements partiels et réclamations (F3-06) ---

export type RefundReasonCode =
  | 'ORDER_CANCELLED'
  | 'VENDOR_REJECTED'
  | 'VENDOR_TIMEOUT'
  | 'DELIVERY_FAILED'
  | 'MISSING_ITEM'
  | 'WRONG_ITEM'
  | 'DAMAGED'
  | 'LATE'
  | 'GOODWILL'
  | 'OTHER';

/** Motifs proposés par le composeur (les autres sont automatiques). */
export type ManualRefundReasonCode = Extract<
  RefundReasonCode,
  'MISSING_ITEM' | 'WRONG_ITEM' | 'DAMAGED' | 'LATE' | 'GOODWILL' | 'OTHER'
>;

export type RefundBearer = 'VENDOR' | 'PLATFORM' | 'DRIVER';
export type RefundLineKind = 'ITEM' | 'DELIVERY_FEE' | 'SERVICE_FEE' | 'GOODWILL';

export interface RefundLine {
  id?: string;
  kind: RefundLineKind;
  orderItemId: string | null;
  quantity: number | null;
  amountXaf: number;
  label?: string;
  orderItem?: { variant: string; product: { nom: string } } | null;
}

export interface RefundLineInput {
  kind: RefundLineKind;
  orderItemId?: string;
  quantity?: number;
  amountXaf?: number;
}

export interface ComposeRefundInput {
  lines: RefundLineInput[];
  reasonCode: ManualRefundReasonCode;
  bearer?: RefundBearer;
  incidentId?: string;
  note?: string;
  /** Virer tout de suite (défaut serveur : oui). */
  execute?: boolean;
}

export interface RefundableItem {
  orderItemId: string;
  label: string;
  orderedQty: number;
  refundedQty: number;
  unitPriceXaf: number;
}

/** `POST /admin/orders/:id/refunds/quote` — calcul serveur, rien d'écrit. */
export interface RefundQuote {
  lines: (RefundLine & { label: string })[];
  totalXaf: number;
  remainingAfterXaf: number;
  refundable: {
    paidXaf: number;
    alreadyRefundedXaf: number;
    remainingXaf: number;
    deliveryFeeRemainingXaf: number;
    serviceFeeRemainingXaf: number;
    items: RefundableItem[];
  };
  suggestedBearer: RefundBearer | null;
  inFlight: boolean;
  /** R-06.5 — ce que l'écriture refusera, dit avant le clic. */
  blockedReason: string | null;
}

export interface ComposedRefund {
  refundId: string;
  amountXaf: number;
  bearer: RefundBearer;
  lines: (RefundLine & { label: string })[];
  remainingAfterXaf: number;
  execution: { executed: boolean; status: string; message: string };
}

export type ClaimReason = 'MISSING_ITEM' | 'WRONG_ITEM' | 'DAMAGED' | 'LATE' | 'OTHER';
export type ClaimOutcome = 'REFUNDED' | 'VOUCHER' | 'REJECTED';
export type MessageVisibility = 'ALL' | 'STAFF_ONLY';

export interface ClaimSummary {
  id: string;
  orderId: string;
  orderRef: string;
  status: IncidentStatus;
  /** Motif client ; les signalements Phase 2 portent leur ancien `kind`. */
  reason: ClaimReason | 'NOT_RECEIVED' | 'WRONG_ORDER' | string;
  summary: string;
  outcome: ClaimOutcome | null;
  resolution: string | null;
  messagesCount: number;
  createdAt: string;
  resolvedAt: string | null;
  title?: string;
}

export interface ClaimsPage {
  data: ClaimSummary[];
  meta: { page: number; limit: number; total: number };
}

export interface ClaimMessage {
  id: string;
  authorRole: 'CLIENT' | 'RESTAURATEUR' | 'LIVREUR' | 'ADMIN';
  authorLabel: string;
  mine: boolean;
  body: string;
  attachments: string[];
  createdAt: string;
  /** Présent pour le support et le vendeur seulement. */
  visibility?: MessageVisibility;
}

export interface ClaimDetail {
  id: string;
  orderId: string;
  orderRef: string;
  status: IncidentStatus;
  reason: ClaimSummary['reason'];
  summary: string;
  items: { orderItemId: string; quantity: number; label: string }[];
  photoUrls: string[];
  outcome: ClaimOutcome | null;
  resolution: string | null;
  voucher: { code: string; amountXaf: number; expiresAt: string } | null;
  createdAt: string;
  resolvedAt: string | null;
  claimWindowClosesAt: string | null;
  order: {
    id: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
    restaurant: { id: string; nom: string };
  };
  messages: ClaimMessage[];
  refunds: {
    id: string;
    amountXaf: number;
    status: RefundStatus;
    createdAt: string;
    processedAt: string | null;
    fromThisClaim: boolean;
    bearer?: RefundBearer;
    reasonCode?: RefundReasonCode;
  }[];
  /** Vendeur et support : ce qui sera retenu sur le reversement. */
  vendorImpactXaf?: number;
  /** Support seulement. */
  title?: string;
  customer?: { id: string; nom: string | null; phone: string | null };
  abuse?: { claims30d: number; accepted30d: number; manualReviewRequired: boolean };
}

export interface CreateClaimInput {
  reason: ClaimReason;
  items?: { orderItemId: string; quantity: number }[];
  note?: string;
  photoUrls?: string[];
}

export interface RefundsPage {
  data: Refund[];
  meta: PaginationMeta;
}

/**
 * Un livreur proposable à l'assignation (`GET /deliveries/deliverers`).
 *
 * Le serveur a déjà écarté les comptes bloqués, supprimés, hors ligne et sans
 * profil actif : cette liste ne contient que des livreurs à qui l'assignation
 * dira oui. `_count.deliveries` est sa charge courante, pas son historique.
 */
export interface AvailableDeliverer {
  id: string;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  driverStatus: DriverStatus | null;
  _count: { deliveries: number };
}

/** La course d'une commande (`GET /deliveries/by-order/:orderId`). */
export interface OrderDelivery {
  id: string;
  status: DeliveryStatus;
  deliverer: {
    id: string;
    nom: string | null;
    phone: string | null;
    imageUrl: string | null;
  } | null;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  estimatedArrival?: string | null;
  /**
   * Code de remise à 4 chiffres (Master Audit v1, F-06). Renvoyé au CLIENT
   * seul, et seulement pendant que la commande roule vers lui ; `null` sinon.
   */
  handoverCode?: string | null;
}
export type DriverStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE';
export type DeliveryPriceMode = 'FIXED' | 'ZONE_BASED';

// --- Tarification de livraison plateforme (F3-02) ---

/**
 * Qui fixe le prix de la course. `VENDOR_LEGACY` : le prix du vendeur
 * (`fixedDeliveryFee` / zones). `PLATFORM` : la grille publiée par Lilia ; le
 * vendeur ne peut plus qu'en offrir une part (`DeliverySubsidyMode`).
 */
export type DeliveryPricingMode = 'VENDOR_LEGACY' | 'PLATFORM';

/** Part de la livraison offerte par le vendeur, retenue sur son reversement. */
export type DeliverySubsidyMode = 'NONE' | 'FIXED' | 'FREE_ABOVE';

export type DeliveryTariffStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';

/** Tranche : jusqu'à `maxKm` inclus (km routiers), le client paie `feeXaf`. */
export interface DeliveryTariffBand {
  maxKm: number;
  feeXaf: number;
}

/** Prix explicite d'un quartier à un autre — prime sur les tranches. */
export interface DeliveryTariffOverride {
  originQuartierId: string;
  destQuartierId: string;
  feeXaf: number;
}

/** `GET /admin/delivery-tariffs` — une version de la grille. */
export interface DeliveryTariff {
  id: string;
  version: number;
  status: DeliveryTariffStatus;
  roadFactor: number;
  note: string | null;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  bands: DeliveryTariffBand[];
  overrides: DeliveryTariffOverride[];
}

/** Corps de `POST` / `PATCH /admin/delivery-tariffs` (remplacement complet). */
export interface DeliveryTariffDraftDto {
  roadFactor: number;
  bands: DeliveryTariffBand[];
  overrides?: DeliveryTariffOverride[];
  note?: string | null;
}

/** `POST /admin/delivery-tariffs/:id/simulate`. */
export interface DeliveryTariffSimulation {
  version: number;
  windowDays: number;
  replay: {
    orders: number;
    historicalBaseXaf: number;
    simulatedBaseXaf: number;
    deltaXaf: number;
    fallbackOrders: number;
    byBasis: Record<'OVERRIDE' | 'BAND' | 'FALLBACK', number>;
  };
  matrix: Array<{
    vendorId: string;
    vendorName: string;
    quartierId: string;
    quartierName: string;
    baseFeeXaf: number;
    distanceKm: number | null;
    basis: 'OVERRIDE' | 'BAND' | 'FALLBACK';
  }>;
}

/** `GET /delivery-tariffs/current` — la grille en vigueur, vue vendeur. */
export interface CurrentDeliveryTariff {
  mode: DeliveryPricingMode;
  tariff: {
    version: number;
    roadFactor: number;
    publishedAt: string | null;
    bands: DeliveryTariffBand[];
    overridesCount: number;
  } | null;
}

/** Corps de `PATCH /vendors/:id/delivery-subsidy` (et paramètres du simulateur). */
export interface UpdateDeliverySubsidyDto {
  mode: DeliverySubsidyMode;
  amountXaf?: number;
  thresholdXaf?: number;
}

/** `GET /vendors/:id/delivery-subsidy/simulate`. */
export interface DeliverySubsidySimulation {
  orders: number;
  costXaf: number;
  subsidizedOrders: number;
}
export type MenuType = 'COMBO' | 'PLAT_SPECIAL';
export type DayOfWeek =
  | 'LUNDI'
  | 'MARDI'
  | 'MERCREDI'
  | 'JEUDI'
  | 'VENDREDI'
  | 'SAMEDI'
  | 'DIMANCHE';
export type DiscountType = 'FIXED' | 'PERCENT' | 'FREE_DELIVERY';

// --- Multi-vendeurs (LIL-110 → LIL-115) ---
// Voir docs/MARKETPLACE.md côté backend pour la matrice complète.
// Pivot lancement : ALCOHOL existe dans l'enum DB mais n'est jamais proposé
// dans l'UI ni accepté par le validator backend.
export type VendorType =
  | 'RESTAURANT'
  | 'HOME_COOK'
  | 'BAKERY'
  | 'BEVERAGE_SHOP'
  | 'GROCERY';

export type ProductType =
  | 'FOOD'
  | 'BEVERAGE'
  | 'ALCOHOL' // réservé futur — masqué côté UI
  | 'PASTRY'
  | 'GROCERY';

export type StockMode = 'DAILY' | 'PERMANENT';

// --- Models ---
export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: Role;
  driverStatus: DriverStatus | null;
  lastLogin: string | null;
  statusUser: StatusUser;
  referralCode: string | null;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Nature d'une écriture de fidélité.
 *
 * Elle est exposée parce que le back-office ne lisait que `reason`, une chaîne
 * libre : impossible d'y distinguer un gain de commande d'une récompense de
 * parrainage ou d'un ajustement manuel, et donc de filtrer ou d'auditer.
 */
export type LoyaltyTransactionType =
  | 'ORDER_SPEND'
  | 'ORDER_EARN'
  | 'CANCELLATION_REFUND'
  | 'REFERRAL_REFERRER'
  /** Historique seulement — le filleul ne reçoit plus de bonus. */
  | 'REFERRAL_REFERRED'
  | 'ADJUSTMENT';

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  points: number;
  type: LoyaltyTransactionType;
  reason: string;
  orderId: string | null;
  /** Filleul à l'origine d'une récompense de parrainage, le cas échéant. */
  sourceUserId: string | null;
  /** Administrateur auteur d'un `ADJUSTMENT`. `null` pour le système. */
  actorId: string | null;
  createdAt: string;
}

/** Arbitrage d'une récompense de parrainage (`GET /admin/referral-rewards`). */
export type ReferralRewardStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';

export interface ReferralRiskSignal {
  code: string;
  weight: number;
  detail: string;
}

export interface ReferralReward {
  id: string;
  status: ReferralRewardStatus;
  riskScore: number;
  riskSignals: ReferralRiskSignal[];
  points: number;
  decidedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  orderId: string;
  referrer: { id: string; nom: string | null; phone: string | null };
  referredUser: { id: string; nom: string | null; phone: string | null };
}

export interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  rewardedReferrals: number;
  loyaltyPoints: number;
}

/** Métadonnées de pagination renvoyées sous `meta` (API Contract v2). */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Enveloppe paginée des endpoints `/admin/*` : contrat conforme `{ data, meta }`.
 * Le backend normalise désormais `{ data, total, page, limit }` en
 * `{ data, meta: { total, page, limit, totalPages } }` (interceptor règle 3b).
 * À consommer via `apiClientRaw` (qui préserve l'enveloppe).
 */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Un client dans la liste admin paginée (GET /admin/clients). */
export interface AdminClientListItem {
  id: string;
  email: string | null;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  loyaltyPoints: number;
  _count: { orders: number };
}

/** Solde + historique de fidélité d'un client (GET /admin/clients/:id/loyalty). */
export interface AdminClientLoyalty {
  balance: number;
  transactions: LoyaltyTransaction[];
}

/** Stats de parrainage d'un client (GET /admin/clients/:id/referral). */
export interface AdminClientReferral {
  referralCode: string | null;
  referredByCode: string | null;
  totalReferrals: number;
  convertedReferrals: number;
  referralBonusEarned: number;
}

/**
 * Image de galerie partagée par les produits (`ProductImage`), les
 * restaurants (`VendorPhoto`) et les menus (`MenuImage`). Même forme côté
 * backend ; les endpoints renvoient la liste triée cover d'abord puis
 * `displayOrder`.
 */
export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  displayOrder: number;
  isCover: boolean;
}

export interface Restaurant {
  id: string;
  nom: string;
  adresse: string;
  phone: string;
  imageUrl: string | null;
  /** Galerie photos vendeur (VendorPhoto). */
  photos?: GalleryImage[];
  latitude: number | null;
  longitude: number | null;
  ownerId: string;
  isActive: boolean;
  isOpen: boolean;
  /**
   * Position voulue par l'administrateur dans les listes publiques
   * (1 = premier, 1000 = défaut « pas encore classé »). Ne décide **jamais**
   * de la visibilité : celle-ci reste portée par
   * `onboardingStatus + adminApproved + isActive`.
   */
  displayOrder?: number;
  /** Mise en avant éditoriale, indépendante de `displayOrder`. */
  isFeatured?: boolean;
  manualOverride: boolean;
  deliveryPriceMode: DeliveryPriceMode;
  fixedDeliveryFee: number;
  /**
   * Réglage de subvention (F3-02). Présent **seulement** sur les vues
   * gestionnaire (`/restaurants/mine`, admin) : le serveur le retient des
   * lectures publiques, le client n'en voit que l'effet dans le devis.
   */
  deliverySubsidyMode?: DeliverySubsidyMode;
  deliverySubsidyXaf?: number | null;
  freeDeliveryThresholdXaf?: number | null;
  /**
   * F3-03 — pause datée : « fermé jusqu'à 14h30 ». Publique (une échéance,
   * pas un motif). Absente d'un serveur antérieur, `null` sans pause.
   */
  pausedUntil?: string | null;
  estimatedDeliveryTimeMin: number;
  estimatedDeliveryTimeMax: number;
  minimumOrderAmount: number;
  createdAt: string;
  updatedAt: string;
  specialties?: Specialty[];
  operatingHours?: OperatingHours[];
  products?: Product[];
  /**
   * Sections de la carte, dans l'ordre voulu par le vendeur.
   * Vue publique : actives uniquement. Vue propriétaire : toutes.
   */
  categories?: Category[];
  reviews?: Review[];
  banners?: Banner[];
  averageRating?: number;
  totalReviews?: number;
  /**
   * Menus du jour actifs (COMBO / PLAT_SPECIAL), servis par la carte.
   *
   * ⚠️ Clé nommée d'après la relation Prisma, pas d'après l'usage. Le site ne
   * les affichait pas du tout — sa route ne les servait pas — alors que
   * l'administration sait les créer et que l'application les affiche depuis
   * toujours. Un vendeur composait donc un menu visible sur une plateforme sur
   * deux, et non commandable sur l'autre.
   */
  menuDuJour?: MenuDuJour[];
  /**
   * Nombre total de produits de la carte, au-delà de ceux embarqués.
   *
   * Servi depuis août 2026 et **lu par personne** jusqu'à la phase 2 : la carte
   * était donc tronquée en silence au-delà de la borne, et comme les clients
   * masquent les sections vides, des sections entières disparaissaient.
   */
  totalProducts?: number;
  /** `true` ⇒ compléter via `GET /products?restaurantId=…&page=n`. */
  hasMoreProducts?: boolean;
  // Multi-vendeurs (LIL-111)
  vendorType?: VendorType;
  adminApproved?: boolean;
  adminApprovedAt?: string | null;
  adminApprovedById?: string | null;
  acceptsPreorders?: boolean;
  preorderLeadHours?: number | null;
  maxOrdersPerDay?: number | null;
  vendorProfile?: VendorProfile | null;

  // Onboarding (août 2026). `onboardingStatus` répond à « sa boutique est-elle
  // configurée » — question distincte de `adminApproved` (« a-t-il sa place
  // sur la marketplace ») et de `isActive` (« est-il suspendu »).
  onboardingStatus?: OnboardingStatus;
  activatedAt?: string | null;
  activatedById?: string | null;
  description?: string | null;
  email?: string | null;
  imagePublicId?: string | null;
  quartierId?: string | null;
  quartier?: Quartier | null;
  deliveryInstructions?: string | null;
  supportsDelivery?: boolean;
  supportsPickup?: boolean;
  /** `null` = taux plateforme. Modifiable par l'ADMIN uniquement. */
  commissionPercent?: number | null;
}

/** Profil enrichi d'un vendeur (story, certifications, etc.) — LIL-112. */
export interface VendorProfile {
  id: string;
  restaurantId: string;
  story: string | null;
  certifications: string[];
  specialties: string[];
  productionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  restaurantId: string;
  createdAt: string;
}

/**
 * Section de la carte d'un vendeur — « Plats », « Boissons », « Spécialités
 * Maison ». Appartient à un et un seul vendeur : deux commerces peuvent avoir
 * chacun leur « Boissons ».
 *
 * Les champs ajoutés en septembre 2026 sont optionnels : un client à jour
 * contre un backend antérieur continue de fonctionner.
 */
export interface Category {
  id: string;
  nom: string;
  restaurantId?: string;
  /** Dérivé de `nom` ; porte l'unicité par vendeur. */
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  /** Ordre voulu par le vendeur — à respecter côté client. */
  displayOrder?: number;
  /** Masquée aux clients sans être supprimée ; ses produits restent vendables. */
  isActive?: boolean;
  /** Présent sur la vue propriétaire uniquement. */
  _count?: { products: number };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  nom: string;
  description: string | null;
  imageUrl: string | null;
  /** Galerie multi-images (ProductImage). */
  images?: GalleryImage[];
  prixOriginal: number;
  stockQuotidien: number | null;
  stockRestant: number | null;
  restaurantId: string;
  /**
   * Vendeur, tel que servi par `GET /products/:id` — **vue réduite**.
   *
   * Ne pas le confondre avec un `Restaurant` complet : le type de vendeur, les
   * horaires et les frais de livraison en sont absents. Pour ceux-là, lire
   * `GET /restaurants/:id`.
   */
  restaurant?: ProductVendorRef;
  /**
   * Le produit est-il dans sa fenêtre de vente **maintenant** ?
   *
   * Calculé par le serveur avec `isWithinAvailabilityWindow`, la fonction même
   * qu'applique le checkout pour accepter ou refuser. Le site ne recopie donc
   * pas la règle : deux implémentations d'une même règle divergent en silence.
   *
   * ⚠️ **Périssable.** Une réponse mise en cache plus de quelques minutes
   * annoncera « disponible » après la fermeture de la fenêtre : la fiche
   * produit ne met volontairement pas cette lecture en cache entre requêtes.
   *
   * Absent des réponses antérieures à septembre 2026 : `undefined` vaut `true`,
   * un produit servi par le catalogue étant par construction vendable.
   */
  availableNow?: boolean;
  categoryId: string | null;
  category?: Category;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
  // Multi-vendeurs (LIL-111, LIL-114)
  productType?: ProductType;
  stockMode?: StockMode;
  ingredients?: string | null;
  shelfLifeDays?: number | null;
  madeToOrder?: boolean;
  availableFrom?: string | null;
  availableUntil?: string | null;
  /**
   * En vente, ou retiré temporairement (fix M2 backend).
   *
   * Distinct de « épuisé » (`stockRestant === 0`) et de « retiré du catalogue »
   * (`deletedAt`). Absent des réponses publiques anciennes : traiter `undefined`
   * comme `true`, un produit servi par le catalogue étant par construction
   * disponible.
   */
  isAvailable?: boolean;
  /** Retiré du catalogue — la ligne ne survit que pour l'historique. */
  deletedAt?: string | null;
  /**
   * F3-09 — groupes d'options (« Accompagnement », « Suppléments »), dans
   * l'ordre du vendeur. Absent ou vide : produit sans option, réponse
   * antérieure à F3-09, ou options pas encore ouvertes par la plateforme.
   */
  modifierGroups?: ModifierGroup[];
  /**
   * F3-09 — verdict du serveur : pourquoi les options rendent le produit
   * incommandable (groupe obligatoire sans option vendable). `null` sinon.
   */
  modifiersUnavailableReason?: string | null;
}

// ─── F3-09 — Options & suppléments ──────────────────────────────────────────

/** Une option de la carte (« Alloco », « Œuf +300 »). */
export interface ModifierOption {
  id: string;
  name: string;
  /** Supplément unitaire en FCFA, jamais négatif. */
  priceDeltaXaf: number;
  /** Combien de fois la même option peut être prise sur une unité (1–10). */
  maxQuantity: number;
  /** Rupture du jour : affichée grisée, non sélectionnable. */
  isAvailable: boolean;
}

/** Un groupe d'options. `minSelect`/`maxSelect` comptent des options DISTINCTES. */
export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: ModifierOption[];
}

/** Option choisie, telle qu'envoyée au serveur — ni prix ni nom. */
export interface SelectedOption {
  optionId: string;
  quantity: number;
}

/** Option d'une ligne de panier, telle que la décrit `GET /cart`. */
export interface CartLineOption {
  optionId: string;
  groupId: string;
  groupName: string;
  name: string;
  priceDeltaXaf: number;
  quantity: number;
}

/** Option figée d'une ligne de commande — jamais relue au catalogue. */
export interface OrderItemOption {
  id: string;
  /** `null` si l'option a été réellement supprimée depuis. */
  optionId: string | null;
  groupId: string | null;
  groupName: string;
  optionName: string;
  priceDeltaXaf: number;
  quantity: number;
  position: number;
}

/** Groupe de la bibliothèque d'un vendeur (`GET /products/manage/modifier-groups`). */
export interface ModifierLibraryGroup {
  id: string;
  restaurantId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  displayOrder: number;
  updatedAt: string;
  /** Options non supprimées, en rupture comprises. */
  options: Array<ModifierOption & { displayOrder: number }>;
  /** Produits auxquels le groupe est attaché. */
  products: Array<{ id: string; nom: string }>;
}

/** Bibliothèque d'options et interrupteurs de déploiement. */
export interface ModifierLibrary {
  groups: ModifierLibraryGroup[];
  meta: {
    restaurantId: string;
    modifiersEnabled: boolean;
    modifiersManagementEnabled: boolean;
    limits: Record<string, number>;
  };
}

/** Option dans le formulaire d'un groupe — `id` absent = création. */
export interface ModifierOptionInput {
  id?: string;
  name: string;
  priceDeltaXaf: number;
  maxQuantity?: number;
  isAvailable?: boolean;
}

/** Problème d'une ligne de panier : le checkout la refusera telle quelle. */
export interface CartLineIssue {
  code: string;
  message: string;
}

/**
 * Vendeur inclus dans la réponse d'un produit.
 *
 * Quatre champs, choisis : `isOpen` parce qu'une fiche produit doit savoir si
 * la boutique prend des commandes, `preorderLeadHours` parce qu'un produit sur
 * commande annonce son préavis. Une route publique n'expose que ce dont elle a
 * besoin — ni le téléphone du vendeur, ni son propriétaire, ni ses coordonnées.
 */
export interface ProductVendorRef {
  id: string;
  nom: string;
  isOpen: boolean;
  preorderLeadHours?: number | null;
}

export interface ProductVariant {
  id: string;
  label: string | null;
  prix: number;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuDuJour {
  id: string;
  nom: string;
  description: string | null;
  imageUrl: string | null;
  /** Galerie multi-images (MenuImage). */
  images?: GalleryImage[];
  prix: number;
  type: MenuType;
  ingredients: string | null;
  stockQuotidien: number | null;
  stockRestant: number | null;
  dateDebut: string;
  dateFin: string;
  isActive: boolean;
  restaurantId: string;
  products?: MenuProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuProduct {
  id: string;
  menuId: string;
  productId: string;
  product?: Product;
  ordre: number;
  createdAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  /**
   * F3-09 — sous-total calculé par le serveur, options comprises, menus
   * comptés une fois. Absent d'un serveur antérieur.
   */
  subTotalXaf?: number;
  /** F3-09 — au moins une ligne ne passera pas le checkout telle quelle. */
  hasIssues?: boolean;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product?: Product;
  menuId: string | null;
  menu?: MenuDuJour;
  variantId: string;
  variant?: ProductVariant;
  quantite: number;
  itemKey: string | null;
  createdAt: string;
  /** F3-09 — identité de la sélection d'options (`''` = aucune). */
  optionsSignature?: string;
  options?: CartLineOption[];
  /** F3-09 — prix unitaire serveur : variante + options. */
  unitPriceXaf?: number;
  optionsTotalXaf?: number;
  /** F3-09 — poids de la ligne dans le sous-total (menu : 1ʳᵉ ligne seule). */
  lineTotalXaf?: number;
  issue?: CartLineIssue | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurant?: Restaurant;
  userId: string;
  subTotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  isDelivery: boolean;
  deliveryAddress: string | null;
  /**
   * Destination figée à la commande, résolue **par le serveur** depuis
   * l'adresse choisie. Snapshot volontaire : corriger l'adresse demain ne
   * doit pas déplacer une commande d'hier.
   */
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  deliveryPrecision?: LocationPrecision;
  deliveryLandmark?: string | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paidAt: string | null;
  notes: string | null;
  contactPhone: string | null;
  items: OrderItem[];
  delivery?: Delivery;
  promoCodeId: string | null;
  discountAmount: number;
  deleteCommande: boolean;
  /** LIL-121 : commande pré-commandée (madeToOrder), renseigné par le backend. */
  isPreorder?: boolean;
  /** LIL-121 : créneau de retrait/livraison demandé (ISO 8601 UTC). */
  scheduledFor?: string | null;
  /**
   * Gestes que le SERVEUR acceptera sur cette commande, pour ce compte (F3-01).
   * Absent sur un serveur antérieur ; liste vide = aucun geste permis.
   */
  allowedActions?: OrderAction[];
  /** Au-delà, une commande payée non acceptée est annulée et remboursée. */
  acceptDeadlineAt?: string | null;
  acceptedAt?: string | null;
  /** Heure de fin de préparation annoncée au client à l'acceptation. */
  estimatedReadyAt?: string | null;
  vendorRejectionReason?: VendorRejectionReason | null;
  /** F3-07 — preuve de remise ; `null` avant la remise ou sur l'historique. */
  deliveryProof?: DeliveryProof | null;
  deliveredAt?: string | null;
  /** Retrait : le client a confirmé « J'ai récupéré ma commande ». */
  customerConfirmedAt?: string | null;
  /** Versement au vendeur possible à partir de cette heure (vendeur, admin). */
  payoutDueAt?: string | null;
  /** Code de retrait — rendu au seul client propriétaire, commande `PRET`. */
  pickupCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Compteurs par statut, calculés par le serveur sur le **périmètre entier** —
 * filtre de statut courant exclu.
 *
 * Les onglets de l'écran Commandes les calculaient sur la page reçue, c'est-à-
 * dire sur vingt lignes arbitraires : « En attente (2) » pouvait s'afficher
 * alors que quarante commandes attendaient. `Partial` parce qu'un backend
 * antérieur à `meta.statusCounts` n'en renvoie aucun — un compteur absent doit
 * se lire comme « inconnu », pas comme zéro.
 */
export type OrderStatusCounts = Partial<Record<OrderStatus, number>>;

/** `meta` des listes de commandes : pagination + compteurs d'onglets. */
export interface OrdersMeta extends PaginationMeta {
  statusCounts: OrderStatusCounts;
}

/**
 * Une page de commandes de la vue d'administration.
 *
 * `user` et `delivery` y figurent parce qu'ils conditionnent ce qu'un opérateur
 * peut faire ensuite : rappeler le client, savoir qui porte la commande.
 */
export interface AdminOrder extends Order {
  user?: {
    id: string;
    nom: string | null;
    phone: string | null;
    imageUrl: string | null;
  };
  delivery?: Delivery & {
    deliverer?: { id: string; nom: string | null; phone: string | null } | null;
  };
}

export interface AdminOrdersPage {
  data: AdminOrder[];
  meta: OrdersMeta;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  menuId: string | null;
  variant: string;
  variantId: string | null;
  variantLabel: string | null;
  snapshotPrice: number | null;
  quantite: number;
  /**
   * Prix unitaire figé — **options comprises** depuis F3-09 (décision Q1) :
   * `prix × quantite` est le montant de la ligne, rien à additionner.
   */
  prix: number;
  createdAt: string;
  /** F3-09 — part des options dans `prix` (ventilation, jamais à rajouter). */
  optionsTotalXaf?: number;
  /** F3-09 — options figées à la commande. */
  options?: OrderItemOption[];
}

export interface Delivery {
  id: string;
  orderId: string;
  delivererId: string | null;
  status: DeliveryStatus;
  estimatedArrival: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastPositionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: PaymentStatus;
  provider: string;
  providerTransactionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Encaissement client ─────────────────────────────────────────────────────

/**
 * Rail d'encaissement en service, servi par `GET /payments/providers`.
 *
 * L'interface s'y adapte au lieu de le coder en dur : en `PAWAPAY` le client
 * valide une demande sur son téléphone, en `MANUAL` il compose un virement.
 * Afficher l'un pour l'autre laisse le client sans savoir quoi faire.
 */
export type PaymentMode = 'MANUAL' | 'SANDBOX' | 'MTN_PRODUCTION' | 'PAWAPAY';

/** Opérateur proposable, et sa disponibilité du moment chez le prestataire. */
export interface PaymentOperator {
  code: 'MTN_MOMO' | 'AIRTEL_MONEY';
  label: string;
  /** `false` = opérateur en panne : proposé grisé, jamais sélectionnable. */
  available: boolean;
}

export interface PaymentProvidersInfo {
  mode: PaymentMode;
  operators: PaymentOperator[];
}

/**
 * Instructions de virement — **mode MANUAL uniquement**, où l'encaissement est
 * un transfert que le client effectue lui-même. Le numéro et le montant
 * viennent du serveur : les recopier depuis une variable d'environnement du
 * front est ce qui faisait afficher un numéro périmé.
 */
export interface ManualPaymentInstructions {
  message: string;
  reference: string;
  phone: string;
  method: PaymentMethod;
  methodLabel: string;
  amount: number;
  currency: string;
  note?: string;
}

/** Réponse de `POST /payments` — la tentative vient d'être ouverte. */
export interface PaymentIntent {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  method: PaymentMethod | null;
  amount: number;
  currency: string;
  /** Délai conseillé avant la première interrogation de statut (ms). */
  pollAfterMs?: number;
  instructions?: ManualPaymentInstructions;
  mode: PaymentMode | 'ZERO_AMOUNT';
}

/**
 * État d'un encaissement — `GET /payments/:id/status` et
 * `GET /payments/by-order/:orderId` (qui rend `null` si rien n'a été tenté).
 */
export interface PaymentStatusView {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: PaymentMethod;
  provider: string;
  failureCode?: string;
  failureMessage?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  user?: Pick<User, 'id' | 'nom' | 'imageUrl'>;
  restaurantId: string;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface CreateReviewDto {
  rating: number; // 1..5
  comment?: string;
  restaurantId: string;
  /** ID de la commande liée (optionnel). Non utilisé côté web pour l'instant. */
  orderId?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface CanReviewResult {
  canReview: boolean;
  reason?: string;
  /** Présent si canReview=false parce que l'user a déjà un avis. */
  existingReviewId?: string;
}

export interface Banner {
  id: string;
  title: string | null;
  imageUrl: string;
  description: string | null;
  linkUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  restaurantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  id: string;
  restaurantId: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Quartier {
  id: string;
  nom: string;
  ville: string;
  createdAt: string;
  /**
   * Centroïde du quartier — repli de position quand une adresse n'en a pas.
   * `null` est un état normal : tous les quartiers de Brazzaville ne sont pas
   * situables automatiquement, un administrateur les complète à la main.
   */
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Fiabilité d'une position de livraison — miroir de l'enum Prisma
 * `LocationPrecision`.
 *
 * `EXACT` : point posé par le client. `APPROXIMATE` : centroïde du quartier,
 * bon à l'échelle du quartier et faux à celle de la rue. `UNKNOWN` : aucune
 * coordonnée — on n'affiche alors **aucun** marqueur, un faux point étant
 * pire que pas de point.
 */
export type LocationPrecision = 'EXACT' | 'APPROXIMATE' | 'UNKNOWN';

export interface Adresse {
  id: string;
  rue: string;
  ville: string;
  etat: string | null;
  country: string;
  userId: string;
  isDefault: boolean;
  quartierId: string | null;
  quartier?: Quartier;
  createdAt: string;
  updatedAt: string;
  /** Position de l'adresse — jamais celle du navigateur au moment de commander. */
  latitude?: number | null;
  longitude?: number | null;
  locationPrecision?: LocationPrecision;
  /** Repères pour le livreur : « portail bleu face à la pharmacie ». */
  landmark?: string | null;
  /** Nom donné par le client : « Maison », « Bureau ». */
  label?: string | null;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  maxUsageTotal: number | null;
  maxUsagePerUser: number;
  firstOrderOnly: boolean;
  isActive: boolean;
  restaurantId: string | null;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promoCodeId?: string;
  code?: string;
  discountType?: DiscountType;
  discountAmount?: number;
  description?: string;
  newTotal?: number;
  newDeliveryFee?: number;
  error?: string;
}

// --- API Response ---
export interface APIResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Dashboard ---
export interface DashboardOverview {
  totalOrders: number;
  totalRevenue: number;
  totalClients: number;
  totalRestaurants: number;
  ordersToday: number;
  revenueToday: number;
}

export interface DashboardOrderStats {
  status: OrderStatus;
  count: number;
  percentage: number;
}

export interface TopProduct {
  productId: string;
  nom: string;
  imageUrl: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface PeakHourData {
  hour: number;
  // Le backend (`getPeakHours`) renvoie `count`, pas `orders` (W12).
  count: number;
}

export interface ClientStats {
  totalClients: number;
  newClientsThisMonth: number;
  returningClients: number;
  topClients: Array<{
    userId: string;
    nom: string | null;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

export interface Favorite {
  id: string;
  userId: string;
  restaurantId: string;
  restaurant?: Restaurant;
  createdAt: string;
}

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

export interface CreateAdresseDto {
  rue: string;
  ville: string;
  etat?: string;
  country: string;
  quartierId?: string;
  /**
   * Position de l'adresse. Le serveur la valide (bornes du Congo, inversion
   * latitude/longitude, `(0, 0)`) et refuse en 400 ce qui ne tient pas debout.
   * Absente ⇒ l'adresse est créée en `UNKNOWN` et la commande retombera sur le
   * centroïde du quartier.
   */
  latitude?: number;
  longitude?: number;
  landmark?: string;
  label?: string;
}

export interface AddToCartDto {
  productId: string;
  variantId: string;
  quantite: number;
  menuId?: string;
  /**
   * F3-09 — options choisies. Facultatif : absent sur un produit à groupe
   * obligatoire, le serveur répond `400 MODIFIER_REQUIRED`.
   */
  options?: SelectedOption[];
}

export interface ValidatePromoDto {
  code: string;
  /**
   * Quartier de l'adresse choisie (F3-02) : en mode plateforme, l'aperçu d'un
   * code « livraison offerte » chiffre la course par le devis de ce quartier.
   */
  quartierId?: string;
  /** ⚠️ Ignorés par le serveur depuis le fix L6 (lus sur le panier serveur). */
  restaurantId?: string;
  subTotal?: number;
  deliveryFee?: number;
}

export interface UpdateProfileDto {
  nom?: string;
  phone?: string;
  imageUrl?: string;
}

/** Un paiement dans la liste admin (GET /admin/payments). */
export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: PaymentStatus;
  /**
   * Rail qui a la charge de CET encaissement — `MANUAL`, `MTN_MOMO`, `PAWAPAY`.
   *
   * ⚠️ C'est lui, et non le mode courant de la plateforme, qui décide si les
   * gestes manuels (confirmer / rejeter) sont permis : un virement ouvert en
   * mode MANUAL reste confirmable à la main après une bascule vers pawaPay, et
   * un dépôt pawaPay ne l'est jamais.
   */
  provider: string;
  /** Référence de la transaction chez le prestataire. */
  providerTransactionId: string | null;
  /** Opérateur visé par cette tentative (peut différer d'`order.paymentMethod`). */
  method: PaymentMethod | null;
  failureCode: string | null;
  failureMessage: string | null;
  completedAt: string | null;
  /** Frais facturés par le prestataire — charge de Lilia Food. */
  collectionFeeXaf: number | null;
  createdAt: string;
  order: {
    id: string;
    total: number;
    status: string;
    /**
     * Méthode choisie par le client au checkout — utile pour distinguer
     * MTN MoMo vs Airtel Money quand `provider === 'MANUAL'`.
     */
    paymentMethod: PaymentMethod;
    user: { id: string; nom: string | null; phone: string | null } | null;
    restaurant: { id: string; nom: string; vendorType: VendorType } | null;
  } | null;
}

// ─── Reversements vendeurs ───────────────────────────────────────────────────

export type PayoutStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type PayoutProvider = 'MTN_MOMO' | 'AIRTEL_MONEY';

/**
 * Réponse de `PATCH /admin/vendors/:id/payout-account`.
 *
 * ⚠️ `payoutPhoneNumber` revient **masqué** (`24206****67`). Le serveur ne rend
 * jamais le numéro en clair, y compris à l'administrateur qui vient de le
 * saisir : pour le changer, on le retape en entier. Ne pas typer ce champ comme
 * une valeur réutilisable — la renvoyer au serveur enregistrerait les
 * astérisques.
 */
// --- Gestes financiers à deux administrateurs (F3-08) ---

export type AdminCapability =
  | 'FINANCE_EXECUTE'
  | 'FINANCE_APPROVE'
  | 'USER_ROLES'
  | 'SETTINGS'
  | 'SUPPORT';

export type ApprovalKind =
  | 'PAYOUT_ACCOUNT_CHANGE'
  | 'REFUND_EXECUTION'
  | 'CAPABILITY_GRANT';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONSUMED';

/**
 * Demande d'un geste financier, en attente d'un SECOND administrateur. Celui
 * qui l'a demandée ne peut pas l'approuver (refusé par l'API et par la base).
 * Approuver exécute le geste.
 */
export interface FinancialApproval {
  id: string;
  kind: ApprovalKind;
  refId: string;
  /** Le geste exact : numéro de versement, montant, capacités. */
  payload: Record<string, unknown>;
  amountXaf: number | null;
  requestedBy: string;
  approvedBy: string | null;
  status: ApprovalStatus;
  reason: string | null;
  expiresAt: string;
  createdAt: string;
  decidedAt: string | null;
}

/** Réponse d'un geste soumis aux 4 yeux : rien n'a encore changé. */
export interface ApprovalRequested {
  approvalRequired: true;
  approval: FinancialApproval;
}

export interface AdminAccount {
  id: string;
  nom: string | null;
  email: string;
  adminCapabilities: AdminCapability[];
}

export interface VendorPayoutAccount {
  id: string;
  nom: string;
  /** Masqué. Jamais réutilisable comme valeur d'entrée. */
  payoutPhoneNumber: string | null;
  payoutProvider: PayoutProvider | null;
  payoutAccountName: string | null;
  payoutVerifiedAt: string | null;
}

/** Motifs de refus renvoyés par le serveur — jamais recalculés côté front. */
export type PayoutIneligibilityCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_CANCELLED'
  | 'ORDER_NOT_READY'
  | 'PAYMENT_NOT_COMPLETED'
  | 'ORDER_REFUNDED'
  | 'VENDOR_PAYOUT_ACCOUNT_MISSING'
  | 'PAYOUT_ALREADY_COMPLETED'
  | 'PAYOUT_IN_PROGRESS'
  | 'PROVIDER_DOES_NOT_SUPPORT_PAYOUT';

export interface PayoutBreakdown {
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  payoutAmount: number;
  currency: string;
}

export interface PayoutEligibility {
  eligible: boolean;
  code?: PayoutIneligibilityCode;
  reason?: string;
  breakdown?: PayoutBreakdown;
}

export interface RestaurantPayout {
  id: string;
  orderId: string;
  restaurantId: string;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  amount: number;
  currency: string;
  status: PayoutStatus;
  provider: string;
  failureCode: string | null;
  failureMessage: string | null;
  requestedBy: string;
  requestedAt: string;
  completedAt: string | null;
}

/** Une ligne de `GET /admin/payouts`. */
export interface AdminPayout extends RestaurantPayout {
  payoutFeeXaf?: number | null;
  restaurant?: { id: string; nom: string; vendorType: VendorType } | null;
  order?: { id: string; status: OrderStatus; subTotal: number; total: number } | null;
}

/**
 * Récapitulatif financier d'une commande (`GET /admin/orders/:id/financials`).
 *
 * Sépare les quatre flux qu'on ne mélange jamais : ce que paie le client, ce
 * que touche le vendeur, ce que garde Lilia Food, ce que coûte le prestataire.
 * **Aucun de ces montants n'est recalculé côté front** — un second calcul finit
 * toujours par diverger de celui qui part réellement.
 */
export interface OrderFinancials {
  orderId: string;
  orderRef: string;
  orderStatus: OrderStatus;
  client: {
    subTotal: number;
    deliveryFee: number;
    serviceFee: number;
    discountAmount: number;
    totalPaid: number;
    currency: string;
    collection: {
      paymentId: string;
      status: PaymentStatus;
      provider: string;
      method: PaymentMethod | null;
      amount: number;
      completedAt: string | null;
      failureCode: string | null;
      failureMessage: string | null;
    } | null;
  };
  restaurant: {
    id: string;
    nom: string;
    grossAmount: number;
    commissionPercent: number;
    commissionAmount: number;
    /** F3-06 — remboursements à la charge du vendeur, retenus sur le virement. */
    refundDeductionAmount?: number;
    payoutAmount: number;
    payoutAccount: {
      /** Masqué par le serveur — le numéro complet ne sort jamais de la base. */
      phoneNumber: string | null;
      provider: PayoutProvider | null;
      accountName: string | null;
      configured: boolean;
    };
    payout: {
      id: string;
      status: PayoutStatus;
      amount: number;
      requestedBy: string;
      requestedAt: string;
      completedAt: string | null;
      failureCode: string | null;
      failureMessage: string | null;
      provider: string;
    } | null;
    /** ⚠️ Seul `SUCCESS` vaut « payé ». Un PENDING n'est pas de l'argent reçu. */
    paid: boolean;
  };
  liliaFood: {
    serviceFee: number;
    restaurantCommission: number;
    /**
     * Frais de livraison encaissés auprès du client — un **revenu** de Lilia :
     * le vendeur ne les reçoit pas (`grossAmount = subTotal`). Ce qu'ils
     * coûtent réellement, la course, est le poste manquant ci-dessous.
     */
    deliveryFeeCollected: number;
    /** Remises offertes par Lilia (promo + fidélité) — un **coût**. */
    discountGranted: number;
    /**
     * Remboursement **réellement versé**. `0` tant qu'il n'est pas `COMPLETED` :
     * un remboursement en cours est une dette, pas une sortie d'argent.
     */
    refundPaid: number;
    collectionFee: number | null;
    payoutFee: number | null;

    /**
     * Rémunération due au livreur pour cette course, en XAF. Figée à
     * l'acceptation, jamais recalculée à la lecture.
     *
     * ⚠️ `null` = **inconnu** : soit la course n'a pas d'économie gelée, soit
     * elle n'existe pas (retrait au comptoir, ou livraison faite hors système).
     * Ne jamais afficher `0` à la place — cela transformerait « on ne sait
     * pas » en « il n'a rien coûté ».
     */
    driverCost: number | null;
    /** Part de Lilia sur la course : `driverBaseXaf − driverPayXaf`. */
    liliaDeliveryShare: number | null;
    /**
     * Rend un `driverCost` de 0 lisible : au salaire, zéro est la bonne
     * réponse. Sans ce champ, il serait indistinguable d'une anomalie.
     */
    driverCompensationModel:
      | 'SALARY'
      | 'PER_DELIVERY'
      | 'SALARY_PLUS_PER_DELIVERY'
      | null;
    driverEmploymentType: 'LILIA' | 'INDEPENDENT' | null;
    driverSharePercent: number | null;

    /**
     * Contribution **hors frais prestataire**.
     *
     * `collectionFee` et `payoutFee` ne sont jamais renseignés : nos types
     * pawaPay n'en modélisent aucun, et la production n'a jamais reçu un seul
     * webhook. Attendre ces deux valeurs revient à ne jamais afficher de marge.
     *
     * Ce nombre est exact dès que le coût livreur est connu. ⚠️ Il ne remplace
     * PAS `contributionMargin` : l'interface doit dire lequel elle montre, sans
     * quoi elle surestimerait le résultat du montant des frais du prestataire.
     */
    contributionMarginBeforeProviderFees: number | null;

    /**
     * Contribution réelle de la commande, ou `null` si un poste **obligatoire**
     * est inconnu — `missingInputs` dit alors lesquels.
     *
     * ⚠️ `null` veut dire **inconnu**, jamais « zéro ». Écrire `?? 0` ici
     * afficherait une marge surestimée avec l'air d'être exacte.
     */
    contributionMargin: number | null;
    /**
     * Postes qui empêchent de conclure. Depuis le 18/09/2026, `driverCost` n'y
     * figure plus dès que la course porte une économie gelée ; restent
     * `collectionFee` et `payoutFee`, jamais renseignés par le prestataire.
     */
    missingInputs: string[];
    /**
     * @deprecated Alias serveur de `contributionMargin`, conservé le temps que
     * les deux back-offices migrent. Ne plus l'afficher.
     */
    netMargin: number | null;
    currency: string;
  };
  /** Le plus récent — conservé pour les écrans antérieurs à F3-06. */
  refund: { id: string; status: string; amount: number } | null;
  /** F3-06 — tous les remboursements de la commande, du plus ancien au plus récent. */
  refunds?: {
    id: string;
    status: RefundStatus;
    amount: number;
    bearer: RefundBearer;
    reasonCode: RefundReasonCode;
    incidentId: string | null;
    createdAt: string;
    processedAt: string | null;
  }[];
  /** Σ des remboursements non rejetés. */
  refundedXaf?: number;
  eligibility: PayoutEligibility;
}

/**
 * Enveloppe de `GET /admin/payouts`.
 *
 * ⚠️ Elle ne porte **pas** `totalPages`, contrairement à `PaginationMeta` :
 * `RestaurantPayoutService.list` construit son `meta` à la main. Le typer comme
 * les autres listes admin ferait lire une valeur `undefined` en la croyant
 * présente ; la pagination se déduit de `total / limit`.
 */
export interface PaginatedPayouts {
  data: AdminPayout[];
  meta: { page: number; limit: number; total: number };
}

/** Réponse de `POST /admin/orders/:id/payout` et `.../payout/retry`. */
export interface PayoutRequestResult {
  payout: RestaurantPayout;
  status: PayoutStatus;
  message?: string;
}

/** KPI agrégés paiements (GET /admin/payments/stats). */
export interface PaymentsStats {
  pending: { count: number; totalXaf: number };
  monthSuccess: { count: number; totalXaf: number };
  last7DaysSuccess: { count: number; totalXaf: number };
  /**
   * Délai moyen PENDING → confirmation sur 7j roulants (instrument DoD LIL-78,
   * cible < 10 min). `avgMinutes` null = pas encore de données sur la fenêtre.
   */
  validationDelay: { avgMinutes: number | null; sampleCount: number };
}

/** Un livreur dans la liste admin (GET /admin/deliverers). */
export interface AdminDeliverer {
  id: string;
  email: string | null;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  createdAt: string;
  deliveries: { id: string; status: string; createdAt: string }[];
  _count: { deliveries: number };
}

/**
 * Statistiques agrégées d'un livreur (GET /admin/deliverers/:id/stats).
 * Aligne le shape Prisma backend (`admin.service.ts::getDelivererStats`).
 */
export interface DelivererStats {
  totalDeliveries: number;
  deliveredCount: number;
  failedCount: number;
  inProgressCount: number;
  /** 0..100 avec 2 décimales — calcul `delivered / (delivered+failed)`. */
  successRate: number;
  /**
   * Valeur des commandes que ce livreur a portées — ce que les CLIENTS ont
   * payé, vendeur inclus. **Ce n'est le revenu de personne**, et surtout pas
   * le sien.
   */
  handledOrderValueXaf: number;
  /** @deprecated Alias de `handledOrderValueXaf`. Le nom laissait croire à un revenu du livreur. */
  totalRevenueXAF: number;
  /**
   * Ce que le livreur a réellement touché sur ses courses livrées, en XAF.
   *
   * ⚠️ Somme des **seules** courses portant une économie gelée.
   * `coursesWithoutEconomics` dit combien ce total ignore : l'afficher seul
   * laisserait croire à un cumul exhaustif. `null` = aucune course connue.
   */
  driverPayXaf: number | null;
  /**
   * Courses livrées sans économie connue — toutes celles antérieures au
   * 18/09/2026, aucun backfill n'ayant été fait.
   */
  coursesWithoutEconomics: number;
  /** Durée moyenne entre `pickedUpAt` et `deliveredAt`, en minutes. */
  avgDeliveryMinutes: number | null;
  last30dDeliveries: number;
  lastDeliveryAt: string | null;
}

/** Une mission dans l'historique du livreur (GET /admin/deliverers/:id/missions). */
export interface DelivererMissionSummary {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  restaurantName: string;
  clientName: string;
  totalXAF: number;
  acceptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

/** Réponse paginée des missions livreur — shape `{ data, meta }`. */
export interface PaginatedDelivererMissions {
  data: DelivererMissionSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Type d'incident (aligne backend Prisma `IncidentType` — 13 valeurs). */
export type IncidentType =
  | 'ORDER_CANCELLED'
  | 'ORDER_DELAYED'
  | 'PAYMENT_FAILED'
  | 'DRIVER_NO_SHOW'
  | 'DRIVER_ACCIDENT'
  | 'CUSTOMER_COMPLAINT'
  | 'RESTAURANT_CLOSED'
  | 'STOCK_ISSUE'
  | 'WRONG_DELIVERY'
  | 'REFUND_REQUEST'
  | 'OTHER'
  /** F3-04 — ouvert et clos par le système (file « À traiter » en retard). */
  | 'OPS_SLA_BREACH'
  /** F3-04 — indicateur anormal (ex. taux d'échec de paiement). */
  | 'METRIC_ANOMALY';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/** Incident operationnel (GET /incidents). */
export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  resolution: string | null;
  orderId: string | null;
  riderId: string | null;
  restaurantId: string | null;
  reportedBy: string | null;
  resolvedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/** Reponse paginee `/incidents` — contrat conforme `{ data, meta: { total } }`. */
export interface PaginatedIncidents {
  data: Incident[];
  meta: { total: number; page?: number; limit?: number; totalPages?: number };
}

/** Configuration plateforme (GET/PATCH /admin/platform-settings). */
export interface PlatformSettings {
  id: string;
  serviceFeePercent: number;
  /**
   * F3-02 — `PLATFORM` refusé (409) tant qu'aucune grille n'est publiée. Le
   * retour à `VENDOR_LEGACY` est la sortie de secours, toujours permise.
   */
  deliveryPricingMode: DeliveryPricingMode;
  /**
   * Commission vendeur par défaut, retenue **sur le vendeur** au reversement —
   * jamais payée par le client, à ne pas confondre avec `serviceFeePercent`.
   *
   * ⚠️ N'affecte que les commandes **futures** : le taux est figé sur chaque
   * commande à sa création, et c'est ce snapshot que lit le reversement.
   * Surchargée par vendeur via `PATCH /admin/vendors/:id/commerce`.
   */
  restaurantCommissionPercent: number;
  /** Forfait gagné par commande livrée (a remplacé `loyaltyPointsPer100Xaf`). */
  loyaltyPointsPerOrder: number;
  /**
   * ⚠️ Le modifier revalorise **tout le passif déjà distribué** : la valeur est
   * lue au moment de la dépense, jamais figée à l'acquisition. Ne jamais la
   * changer sans exécuter d'abord `scripts/db/redenominate-loyalty.js`.
   */
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
  referrerBonusPoints: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;

  // ── Canal de mise à jour du parc mobile (lilia-app) ──────────────────────
  //
  // Servis par le backend depuis le 08/09/2026, absents de ce type jusqu'au
  // 22/09 (CONFIG-UPDATE-001) : l'Admin Web ne pouvait ni voir ni lever un
  // blocage actif en production. Règles : `apps/admin/lib/app-update-rules.ts`.

  /** Seuil **bloquant** : en dessous, le client ne peut plus commander. */
  minAppVersion: string | null;
  /** Dernière version publiée ; en dessous, invitation reportable. */
  latestAppVersion: string | null;
  /** Fiche Google Play ; `null` = repli compilé dans l'app. */
  updateUrlAndroid: string | null;
  /** Fiche App Store ; `null` = repli compilé (recherche « Lilia Food »). */
  updateUrlIos: string | null;
  /** Message affiché dans le dialogue de mise à jour (≤ 300 caractères). */
  updateMessage: string | null;

  // ── Options & suppléments (F3-09) ──────────────────────────────────────

  /**
   * La plateforme vend-elle des options ? Éteint : carte et panier d'avant
   * F3-09 (sortie de secours). À allumer après publication des apps clientes.
   */
  modifiersEnabled: boolean;
  /**
   * Éditeur d'options ouvert aux vendeurs. Exige `modifiersEnabled` (409
   * `MODIFIERS_ROLLOUT_ORDER` sinon) ; éteindre les options le ferme aussi.
   */
  modifiersManagementEnabled: boolean;

  /** Horodatage de la dernière écriture — renvoyé en `expectedUpdatedAt`. */
  updatedAt: string;
}

/**
 * Corps de `PATCH /admin/platform-settings`.
 *
 * - N'y figurent que les champs **modifiés** : renvoyer le formulaire entier
 *   réécrivait des valeurs périmées par-dessus celles d'un autre administrateur.
 * - `null` **efface** (versions, URL, messages) ; `""` est refusé pour une
 *   version et normalisé en `null` pour un message.
 * - `expectedUpdatedAt` = `updatedAt` chargé : 409 si la configuration a changé
 *   depuis (verrou optimiste).
 */
export type UpdatePlatformSettingsPayload = Partial<
  Omit<PlatformSettings, 'id' | 'updatedAt'>
> & {
  expectedUpdatedAt?: string;
};

// --- Admin marketplace multi-vendeurs (LIL-113) ---

/**
 * Item d'une vue admin vendeurs (GET /admin/vendors).
 * Étend Restaurant avec les jointures retournées pour la modération.
 */
export interface AdminVendor extends Restaurant {
  owner: { id: string; email: string | null; nom: string | null; phone: string | null };
  _count?: { products: number; orders: number };
}

/** Réponse paginée admin vendeurs : `{ data, meta }` (style /vendors). */
export interface AdminVendorsPage {
  data: AdminVendor[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Stats marketplace pour l'admin dashboard (GET /dashboard/vendors). */
export interface VendorStats {
  total: number;
  pendingApproval: number;
  suspended: number;
  byType: Partial<Record<VendorType, number>>;
}

/** Filtres acceptés par GET /admin/vendors. */
export interface AdminVendorFilters {
  vendorType?: VendorType;
  adminApproved?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Body de POST /admin/restaurants — création vendeur + owner.
 * Sans `vendorType` → RESTAURANT auto-approuvé (compat. historique).
 * Avec `vendorType` non-RESTAURANT → adminApproved=false.
 *
 * LIL-118 : le user Firebase Auth est créé par le backend depuis email +
 * password. `ownerFirebaseUid` n'est plus dans le DTO.
 */
/**
 * @deprecated Utiliser `CreateVendorOnboardingDto` avec `POST /admin/vendors`.
 *
 * Ce contrat impose à l'administrateur de choisir le mot de passe du vendeur,
 * puis de le lui transmettre hors du système. Le nouveau flux envoie une
 * invitation d'activation : personne d'autre que le vendeur ne connaît son
 * secret. La route reste servie pour ne rien casser pendant la transition.
 */
export interface CreateRestaurantWithOwnerDto {
  email: string;
  password: string;
  nom: string;
  phone?: string;
  restaurantNom: string;
  restaurantAdresse: string;
  restaurantPhone: string;
  restaurantImageUrl?: string;
  vendorType?: VendorType;
  acceptsPreorders?: boolean;
  preorderLeadHours?: number;
  maxOrdersPerDay?: number;
  story?: string;
  certifications?: string[];
  specialties?: string[];
  productionNote?: string;
}

// --- Onboarding vendeur (août 2026) ---
//
// Un vendeur créé n'est ni prêt ni ouvert. `onboardingStatus` décrit
// l'avancement de sa configuration, orthogonalement à `adminApproved`
// (validation marketplace) et `isActive` (suspension).

export type OnboardingStatus = 'DRAFT' | 'READY' | 'ACTIVATED';

export type ReadinessStatus = 'OK' | 'MISSING' | 'INVALID';

/** Une case de la checklist « prêt à vendre », calculée par le backend. */
export interface ReadinessCheck {
  /** Identifiant stable : sert à router vers l'étape correspondante. */
  key:
    | 'owner'
    | 'identity'
    | 'description'
    | 'logo'
    | 'cover'
    | 'location'
    | 'gps'
    | 'hours'
    | 'delivery'
    // Ajoutée par le backend en septembre 2026, et jamais reportée ici : le web
    // ignorait donc l'existence d'une case **bloquante**. `payout` n'était
    // rattachée à aucune étape de l'assistant et aucun champ ne permettait de la
    // remplir — un vendeur configuré depuis le web restait inactivable sans que
    // rien ne dise pourquoi.
    | 'payout'
    | 'commerce'
    | 'catalog';
  label: string;
  status: ReadinessStatus;
  /** Une case non bloquante manquante n'empêche pas l'activation. */
  blocking: boolean;
  detail?: string;
}

/**
 * État d'onboarding d'un vendeur.
 *
 * ⚠️ Calculé **par le serveur** et affiché tel quel. Ne jamais recalculer
 * `isReady` côté client : deux implémentations de la même règle divergent, et
 * c'est celle du serveur qui décide de l'activation.
 */
export interface OnboardingReport {
  restaurantId: string;
  onboardingStatus: OnboardingStatus;
  isReady: boolean;
  /** Progression sur les seules cases bloquantes (0–100). */
  progress: number;
  checks: ReadinessCheck[];
  blockingIssues: string[];
}

export interface CreateVendorOnboardingDto {
  vendorType: VendorType;
  ownerEmail: string;
  ownerNom: string;
  ownerPhone: string;
  nom: string;
  adresse: string;
  phone: string;
  description?: string;
}

export interface UpdateVendorIdentityDto {
  nom?: string;
  description?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
  imagePublicId?: string;
  specialties?: string[];
}

export interface UpdateVendorLocationDto {
  adresse?: string;
  quartierId?: string;
  latitude?: number;
  longitude?: number;
  deliveryInstructions?: string;
}

export interface UpdateVendorDeliveryDto {
  supportsDelivery?: boolean;
  supportsPickup?: boolean;
  deliveryPriceMode?: DeliveryPriceMode;
  fixedDeliveryFee?: number;
  estimatedDeliveryTimeMin?: number;
  estimatedDeliveryTimeMax?: number;
  /**
   * Réglé dans le même écran que le reste de la livraison. Il manquait à cette
   * route, ce qui obligeait à passer par `PATCH /restaurants/:id/delivery-settings`
   * pour ce seul champ — deux routes pour un formulaire.
   */
  minimumOrderAmount?: number;
  deliveryInstructions?: string;
}

// ─── Zones de livraison ──────────────────────────────────────────────────────

/** Rattachement d'un quartier à une zone tarifaire d'un vendeur. */
export interface QuartierZone {
  id: string;
  quartierId: string;
  deliveryZoneId: string;
  quartier?: Quartier;
}

/**
 * Palier tarifaire d'un vendeur. **Propre à chaque vendeur** : le même quartier
 * peut valoir 500 F chez l'un et 1 500 F chez l'autre. Il n'existe aucun tarif
 * de zone global au marketplace.
 */
export interface DeliveryZone {
  id: string;
  restaurantId: string;
  zoneName: string;
  /** Montant en XAF entiers. */
  fee: number;
  quartiers: QuartierZone[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Couverture de la ville — **calculée par le serveur**.
 *
 * « Quels quartiers ne sont couverts par aucune zone ? » décide de qui paiera
 * le tarif de repli : c'est une règle métier, pas un détail d'affichage. La
 * recalculer côté interface en donnerait une version par client.
 */
export interface DeliveryZoneCoverage {
  totalQuartiers: number;
  coveredQuartiers: number;
  uncovered: Pick<Quartier, 'id' | 'nom'>[];
  /** Ce que paieront les quartiers non couverts, si le mode est ZONE_BASED. */
  fallbackFee: number;
}

/** Réponse de `GET /vendors/:id/delivery-zones` (ADMIN ou propriétaire). */
export interface VendorDeliveryZones {
  restaurantId: string;
  nom: string;
  deliveryPriceMode: DeliveryPriceMode;
  fixedDeliveryFee: number;
  minimumOrderAmount: number;
  estimatedDeliveryTimeMin: number;
  estimatedDeliveryTimeMax: number;
  supportsDelivery: boolean;
  supportsPickup: boolean;
  /** F3-02 — part de la livraison offerte par le vendeur (vue gestionnaire). */
  deliverySubsidyMode: DeliverySubsidyMode;
  deliverySubsidyXaf: number | null;
  freeDeliveryThresholdXaf: number | null;
  zones: DeliveryZone[];
  coverage: DeliveryZoneCoverage;
}

export interface CreateDeliveryZoneDto {
  zoneName: string;
  fee: number;
  quartierIds?: string[];
}

export interface UpdateDeliveryZoneDto {
  zoneName?: string;
  fee?: number;
  quartierIds?: string[];
}

/** ADMIN uniquement — porte la commission, donc la marge de la plateforme. */
export interface UpdateVendorCommerceDto {
  commissionPercent?: number | null;
  minimumOrderAmount?: number;
  acceptsPreorders?: boolean;
  preorderLeadHours?: number;
  maxOrdersPerDay?: number;
}

/**
 * Résultat de l'invitation d'activation.
 *
 * `activationLink` n'est renseigné **que** si l'e-mail n'est pas parti : c'est
 * un repli pour que l'administrateur puisse débloquer le vendeur à la main
 * plutôt que de le laisser sans accès.
 */
export interface VendorInvitationResult {
  emailSent: boolean;
  smsSent: boolean;
  activationLink?: string;
  detail: string;
}

export interface CreateVendorResponse {
  vendor: Restaurant;
  readiness: OnboardingReport | null;
  invitation?: VendorInvitationResult;
}

// --- Photo Galleries (E1/E2) ---
// Trois entités backend (vendor-photos, product-images, menu-images)
// partagent un shape identique côté API → un seul type Photo + un
// discriminant EntityType.

export type EntityType = 'vendor' | 'product' | 'menu';

export interface Photo {
  id: string;
  url: string;
  publicId: string | null;
  alt: string | null;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

// Aliases pour clarifier les call sites quand l'entité est connue.
export type VendorPhoto = Photo & { restaurantId: string };
export type ProductImage = Photo & { productId: string };
export type MenuImage = Photo & { menuDuJourId: string };


// ─── Livreurs (septembre 2026) ────────────────────────────────────────────────

/**
 * Profil métier du livreur, distinct de son compte.
 *
 * ⚠️ Trois statuts à ne jamais confondre, et c'est pourquoi ils arrivent
 * séparément du serveur plutôt que fondus en un seul :
 *   · `User.statusUser`         — le compte est-il valide ?
 *   · `DriverProfile.isActive`  — le livreur est-il en service ?
 *   · `User.driverStatus`       — est-il disponible maintenant ?
 * « Compte actif, profil actif, hors ligne » décrit un livreur qui a fini sa
 * journée. C'est un état normal.
 */
export interface DriverProfile {
  id: string;
  vehicleType: VehicleType;
  plateNumber: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  isActive: boolean;
  activatedAt: string | null;
  activatedById: string | null;
  deactivationReason: string | null;
  zones: { id: string; nom: string; ville?: string }[];
}

/** Une ligne de `GET /admin/drivers`. */
export interface AdminDriverListItem {
  id: string;
  nom: string | null;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  statusUser: StatusUser;
  driverStatus: DriverStatus | null;
  lastLogin: string | null;
  createdAt: string;
  driverProfile: DriverProfile | null;
  _count?: { deliveries: number };
}

/** `GET /admin/drivers/:id` — la fiche, avec son activité. */
export interface AdminDriverDetail extends AdminDriverListItem {
  activity: {
    activeDeliveries: {
      id: string;
      orderId: string;
      status: DeliveryStatus;
      acceptedAt: string | null;
      pickedUpAt: string | null;
      order: { restaurant: { nom: string } } | null;
    }[];
    lastDeliveryAt: string | null;
    averageRating: number | null;
    totalRatings: number;
  };
}

export interface CreateDriverDto {
  email: string;
  nom: string;
  phone: string;
  imageUrl?: string;
  vehicleType: VehicleType;
  plateNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  zoneIds?: string[];
}

export type UpdateDriverDto = Partial<Omit<CreateDriverDto, 'email'>>;

export interface DriverFilters {
  search?: string;
  isActive?: boolean;
  driverStatus?: DriverStatus;
  statusUser?: StatusUser;
  page?: number;
  limit?: number;
}

// ─── Utilisateurs (administration) ───────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  email: string;
  nom: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: Role;
  statusUser: StatusUser;
  createdAt: string;
  lastLogin: string | null;
  _count?: { orders: number };
}

/**
 * `GET /admin/users/:id`. `restaurant` et `driverProfile` y figurent parce
 * qu'ils conditionnent ce qu'un administrateur a le droit de faire ensuite :
 * on ne retire pas le rôle RESTAURATEUR à quelqu'un qui tient une boutique en
 * ligne sans le savoir.
 */
export interface AdminUserDetail extends AdminUserListItem {
  driverStatus: DriverStatus | null;
  restaurant: {
    id: string;
    nom: string;
    onboardingStatus: string;
    adminApproved: boolean;
    isActive: boolean;
  } | null;
  driverProfile: { id: string; isActive: boolean; vehicleType: VehicleType } | null;
  _count?: { orders: number; deliveries: number };
}

export interface AdminUserFilters {
  role?: Role;
  statusUser?: StatusUser;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Règlements livreurs ────────────────────────────────────────────────────

export type DriverSettlementMethod =
  | 'CASH'
  | 'MOBILE_MONEY'
  | 'BANK_TRANSFER'
  | 'OTHER';

/**
 * ⚠️ Deux valeurs seulement, et aucun état d'attente : un règlement n'est
 * enregistré qu'APRÈS remise de l'argent. `CANCELLED` couvre la saisie
 * erronée, pas un flux.
 */
export type DriverSettlementStatus = 'PAID' | 'CANCELLED';

/**
 * Ce qui reste dû à un livreur (`GET /admin/driver-settlements/outstanding/:id`).
 *
 * ⚠️ **Lecture pure** : la consulter ne verrouille aucune course. `coveredUntil`
 * doit être rejoué tel quel à l'enregistrement — c'est lui qui garantit que le
 * versement couvre exactement les courses vues, et pas celles terminées
 * pendant qu'on allait payer.
 */
export interface DriverOutstanding {
  driverId: string;
  coveredUntil: string;
  amountXaf: number;
  courseCount: number;
  /** Première course non réglée, ou `null` s'il n'y en a aucune. */
  periodStart: string | null;
  currency: string;
}

/** Un versement déjà effectué, hors application. */
export interface DriverSettlement {
  id: string;
  driverId: string;
  amountXaf: number;
  courseCount: number;
  periodStart: string;
  coveredUntil: string;
  currency: string;
  status: DriverSettlementStatus;
  method: DriverSettlementMethod;
  /** N° de transaction Mobile Money, n° de reçu — seule trace opposable. */
  reference: string | null;
  note: string | null;
  /** Instant déclaré de la remise, distinct de l'enregistrement. */
  paidAt: string;
  recordedBy: string;
  recordedAt: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface PaginatedDriverSettlements {
  data: DriverSettlement[];
  meta: { page: number; limit: number; total: number };
}

// --- Journal d'audit (GET /admin/audit-log) ---

/**
 * Actions journalisées — miroir de l'enum Prisma `AdminAuditAction`.
 * Liste exhaustive des libellés : `apps/admin/lib/audit-labels.ts`.
 */
export type AdminAuditAction =
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_RETRIED'
  | 'PAYOUT_CANCELLED'
  | 'VENDOR_PAYOUT_ACCOUNT_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'DRIVER_CREATED'
  | 'DRIVER_UPDATED'
  | 'DRIVER_ACTIVATED'
  | 'DRIVER_DEACTIVATED'
  | 'DRIVER_SETTLEMENT_RECORDED'
  | 'DRIVER_SETTLEMENT_CANCELLED'
  | 'VENDOR_DISPLAY_ORDER_CHANGED'
  | 'VENDOR_FEATURED_TOGGLED'
  | 'VENDOR_CREATED'
  | 'VENDOR_ACTIVATED'
  | 'VENDOR_COMMISSION_CHANGED'
  | 'VENDOR_CATALOG_EDITED'
  | 'VENDOR_APPROVED'
  | 'VENDOR_SUSPENDED'
  | 'VENDOR_ACTIVE_TOGGLED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_REJECTED'
  | 'REFUND_CREATED'
  | 'REFUND_UPDATED'
  | 'ORDER_STATUS_FORCED'
  | 'LOYALTY_ADJUSTED'
  | 'PLATFORM_SETTINGS_CHANGED'
  | 'REFERRAL_REWARD_REVIEWED';

export interface AdminAuditEntry {
  id: string;
  action: AdminAuditAction | string;
  targetType: string;
  targetId: string;
  reason: string | null;
  /** Pour `PLATFORM_SETTINGS_CHANGED` : `{ champ: { before, after } }`. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; nom: string | null; email: string | null } | null;
}

export interface PaginatedAuditLog {
  data: AdminAuditEntry[];
  meta: { page: number; limit: number; total: number };
}

// --- Fermetures datées (F3-03) ---

/** Pourquoi la boutique est ouverte ou fermée, selon la règle serveur. */
export type VendorOpeningReason =
  | 'OPEN'
  | 'PAUSED'
  | 'CLOSURE'
  | 'HOLIDAY'
  | 'MANUAL'
  | 'OUTSIDE_HOURS';

export interface VendorClosure {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

/** `GET /vendors/:id/opening` — vue gestionnaire. */
export interface VendorOpeningState {
  isOpen: boolean;
  reason: VendorOpeningReason;
  /** Fin de la fermeture datée (pause ou congé), sinon `null`. */
  until: string | null;
  pausedUntil: string | null;
  pauseReason: string | null;
  closedOnHolidays: boolean;
  closures: VendorClosure[];
}

/** `POST /vendors/:id/pause` — une durée **ou** une échéance (≤ 7 jours). */
export type PauseVendorDto =
  | { minutes: number; until?: undefined; reason?: string }
  | { minutes?: undefined; until: string; reason?: string };

export interface CreateVendorClosureDto {
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface PublicHoliday {
  /** « AAAA-MM-JJ » (colonne date, sérialisée en ISO minuit UTC). */
  date: string;
  label: string;
  country: string;
}

// --- Cockpit ops « À traiter » (F3-04) ---

export type OpsBucketKey =
  | 'acceptance_late'
  | 'no_driver'
  | 'en_route_long'
  | 'delivery_failed'
  | 'refunds_pending'
  | 'claims_unanswered'
  /** F3-07 — retrait remis par le vendeur seul, non confirmé depuis 1 h. */
  | 'pickup_unconfirmed'
  | 'payouts_failed'
  | 'incidents_open'
  | 'outbox_failed';

export interface OpsItem {
  id: string;
  orderId: string | null;
  title: string;
  detail: string | null;
  since: string;
}

export interface OpsBucket {
  key: OpsBucketKey;
  label: string;
  severity: 'HIGH' | 'MEDIUM';
  count: number;
  oldestAt: string | null;
  items: OpsItem[];
}

/** `GET /admin/ops/queue`. */
export interface OpsQueue {
  generatedAt: string;
  total: number;
  buckets: OpsBucket[];
}

// --- Échec de livraison (F3-05) ---

export type DeliveryFailureReason =
  | 'CUSTOMER_UNREACHABLE'
  | 'ADDRESS_NOT_FOUND'
  | 'CUSTOMER_REFUSED'
  | 'ACCIDENT'
  | 'LOST_OR_DAMAGED'
  | 'DRIVER_NO_SHOW'
  | 'OTHER';

/** Qui répond d'un échec conclu : décide de l'argent (matrice R-05.3). */
export type FailureLiability = 'CLIENT' | 'DRIVER' | 'VENDOR' | 'PLATFORM';

/** `GET /admin/orders/:id/failure-evidence`. */
export interface DeliveryFailureReport {
  id: string;
  reportedBy: string;
  reportedByRole: string;
  reason: DeliveryFailureReason | null;
  note: string | null;
  distanceToDestM: number | null;
  callAttempts: number;
  smsSentAt: string | null;
  protocolStartedAt: string | null;
  declaredAt: string | null;
  createdAt: string;
}

/** `POST /admin/orders/:id/conclude-failure` — montants de la matrice. */
export interface FailureConclusion {
  orderId: string;
  liability: FailureLiability;
  refundXaf: number;
  vendorPaid: boolean;
  driverPayXaf: number;
  reason: DeliveryFailureReason | null;
  dryRun: boolean;
}
