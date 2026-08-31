// --- Enums ---
export type Role = 'ADMIN' | 'RESTAURATEUR' | 'LIVREUR' | 'CLIENT';
export type StatusUser = 'INACTIVE' | 'ACTIVE' | 'BLOCKED';
export type OrderStatus =
  | 'EN_ATTENTE'
  | 'PAYER'
  | 'EN_PREPARATION'
  | 'PRET'
  | 'EN_ROUTE'
  | 'LIVRER'
  | 'ANNULER';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'MTN_MOMO' | 'AIRTEL_MONEY';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type DeliveryStatus = 'EN_ATTENTE' | 'ASSIGNER' | 'EN_TRANSIT' | 'LIVRER' | 'ECHEC';
export type DriverStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE';
export type DeliveryPriceMode = 'FIXED' | 'ZONE_BASED';
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

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  points: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
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
  manualOverride: boolean;
  deliveryPriceMode: DeliveryPriceMode;
  fixedDeliveryFee: number;
  estimatedDeliveryTimeMin: number;
  estimatedDeliveryTimeMax: number;
  minimumOrderAmount: number;
  createdAt: string;
  updatedAt: string;
  specialties?: Specialty[];
  operatingHours?: OperatingHours[];
  products?: Product[];
  reviews?: Review[];
  banners?: Banner[];
  averageRating?: number;
  totalReviews?: number;
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

export interface Category {
  id: string;
  nom: string;
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
  createdAt: string;
  updatedAt: string;
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
  prix: number;
  createdAt: string;
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
}

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
}

export interface AddToCartDto {
  productId: string;
  variantId: string;
  quantite: number;
  menuId?: string;
}

export interface ValidatePromoDto {
  code: string;
  restaurantId: string;
  subTotal: number;
  deliveryFee: number;
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
    collectionFee: number | null;
    payoutFee: number | null;
    /** Connue seulement quand les deux frais prestataire le sont. */
    netMargin: number | null;
    currency: string;
  };
  refund: { id: string; status: string; amount: number } | null;
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
  totalRevenueXAF: number;
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

/** Type d'incident (aligne backend Prisma `IncidentType` — 11 valeurs). */
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
  | 'OTHER';

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
  loyaltyPointsPer100Xaf: number;
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
  referrerBonusPoints: number;
  referredBonusPoints: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

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
  deliveryInstructions?: string;
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
