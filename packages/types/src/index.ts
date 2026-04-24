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
  createdAt: string;
  updatedAt: string;
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

// --- DTOs ---
export interface CreateOrderDto {
  paymentMethod: PaymentMethod;
  adresseId?: string;
  isDelivery?: boolean;
  notes?: string;
  contactPhone?: string;
  promoCode?: string;
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
