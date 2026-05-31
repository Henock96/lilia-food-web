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
export type OrderLifecycleStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';
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

/**
 * Enveloppe paginée des endpoints `/admin/*` : `{ data, total, page, limit }`.
 * Distincte de `PaginatedResponse<T>` : ces endpoints ne renvoient PAS de
 * champ `totalPages` — il se dérive côté client via `Math.ceil(total / limit)`.
 * Ne pas fusionner les deux types tant que le backend n'expose pas `totalPages`.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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

export interface Restaurant {
  id: string;
  nom: string;
  adresse: string;
  phone: string;
  imageUrl: string | null;
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
  lifecycleStatus: OrderLifecycleStatus | null;
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
  orders: number;
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
  provider: string;
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
  } | null;
}

/** KPI agrégés paiements (GET /admin/payments/stats). */
export interface PaymentsStats {
  pending: { count: number; totalXaf: number };
  monthSuccess: { count: number; totalXaf: number };
  last7DaysSuccess: { count: number; totalXaf: number };
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

/** Reponse paginee `/incidents` — pas de `meta`, juste `{ data, total }`. */
export interface PaginatedIncidents {
  data: Incident[];
  total: number;
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
