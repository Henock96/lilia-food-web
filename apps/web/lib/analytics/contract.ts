/**
 * Contrat Analytics Lilia Food — source unique des noms d'événements.
 *
 * Ce fichier est le **jumeau TypeScript** de `lilia-app/lib/analytics/
 * analytics_events.dart`. Les deux déclarent exactement les mêmes noms
 * d'événements et les mêmes clés de paramètres. Toute modification ici doit
 * être répercutée là-bas dans le même changement — sans quoi les chiffres du
 * web et ceux des applications cessent d'être comparables, ce qui est le seul
 * problème que ce contrat existe pour empêcher.
 *
 * La documentation de référence — signification de chaque événement et règle de
 * déclenchement — vit dans `docs/analytics.md` à la racine du dépôt web.
 *
 * ⚠️ Un événement n'est pas un libellé d'interface. `restaurant_view` signifie
 * « le client a consulté la fiche d'un vendeur », jamais « une carte vendeur est
 * apparue dans une liste ». Voir `docs/analytics.md`.
 */

/* ────────────────────────── Événements du tunnel ─────────────────────────── */

/**
 * Les neuf événements du tunnel officiel, dans l'ordre.
 *
 * Ce sont les seuls dont les chiffres sont comparés entre web, Android et iOS.
 * On n'ajoute pas de variante : pas de `restaurant_open`, `view_restaurant` ni
 * `restaurant_clicked` — une seule graphie par événement métier.
 */
export const FUNNEL_EVENTS = [
  'page_view',
  'restaurant_view',
  'product_view',
  'add_to_cart',
  'view_cart',
  'begin_checkout',
  'payment_started',
  'payment_success',
  'order_created',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/**
 * Événements secondaires, propres au site vitrine.
 *
 * Ils ne font pas partie du tunnel et n'ont pas d'équivalent mobile : mesurer
 * les clics « Télécharger l'application » sur une application n'aurait aucun
 * sens. Ils vivent ici pour partager le même désinfectant et la même
 * déduplication, pas pour être comparés aux applications.
 */
export const SECONDARY_EVENTS = [
  'app_download_click',
  'order_cta_click',
  'vendor_cta_click',
  'category_filter',
  'empty_filter_view',
  'contact_click',
  'whatsapp_click',
  'phone_click',
  'signup_start',
  'signup_success',
] as const;

export type SecondaryEvent = (typeof SECONDARY_EVENTS)[number];

export type AnalyticsEvent = FunnelEvent | SecondaryEvent;

/* ──────────────────────── Paramètres autorisés ───────────────────────────── */

/**
 * Liste blanche des paramètres, par événement.
 *
 * C'est une **liste blanche**, pas une liste noire : tout paramètre non déclaré
 * ici est retiré avant l'envoi. C'est la garantie principale d'absence de
 * données personnelles — elle tient même si quelqu'un passe par mégarde un
 * objet produit entier, avec le téléphone du vendeur dedans.
 *
 * `page_view` fait exception au caractère commun des paramètres : le web décrit
 * une URL, le mobile décrit un écran. Le **nom** de l'événement reste commun,
 * ce qui est ce que le tunnel exige.
 */
export const EVENT_PARAMS = {
  page_view: ['page_path', 'page_title', 'page_location'],
  restaurant_view: ['restaurant_id', 'restaurant_name'],
  product_view: ['product_id', 'product_name', 'restaurant_id', 'price'],
  add_to_cart: [
    'product_id',
    'product_name',
    'restaurant_id',
    'price',
    'quantity',
  ],
  view_cart: ['item_count', 'cart_total'],
  begin_checkout: ['item_count', 'cart_total'],
  payment_started: ['order_id', 'payment_method', 'amount', 'currency'],
  payment_success: ['order_id', 'payment_method', 'amount', 'currency'],
  order_created: ['order_id', 'amount', 'currency', 'item_count'],

  // Secondaires — site vitrine.
  app_download_click: ['page_path'],
  order_cta_click: ['page_path'],
  vendor_cta_click: ['page_path'],
  category_filter: ['vendor_type', 'page_path'],
  empty_filter_view: ['vendor_type', 'has_search', 'page_path'],
  contact_click: ['page_path'],
  whatsapp_click: ['page_path'],
  phone_click: ['page_path'],
  signup_start: ['page_path'],
  signup_success: ['page_path'],
} as const satisfies Record<AnalyticsEvent, readonly string[]>;

/** Devise unique de la plateforme. Aucun montant ne voyage sans elle. */
export const CURRENCY = 'XAF';

/* ─────────────────────── Typage des charges utiles ───────────────────────── */

export type AnalyticsValue = string | number | boolean;

/** Paramètres acceptés pour un événement donné — vérifiés à la compilation. */
export type EventParams<E extends AnalyticsEvent> = Partial<
  Record<(typeof EVENT_PARAMS)[E][number], AnalyticsValue>
>;

export type AnyParams = Record<string, unknown>;

/* ──────────────────────── Garde-fous confidentialité ─────────────────────── */

/**
 * Fragments de noms de clés interdits, quelle que soit leur valeur.
 *
 * Second filet derrière la liste blanche : si quelqu'un ajoute demain
 * `customer_phone` à `EVENT_PARAMS`, la revue de code peut le laisser passer —
 * pas ce tableau. Il est délibérément redondant.
 */
export const FORBIDDEN_KEY_FRAGMENTS = [
  'phone',
  'telephone',
  'tel',
  'msisdn',
  'email',
  'mail',
  'password',
  'mot_de_passe',
  'token',
  'jwt',
  'secret',
  'credential',
  'lat',
  'lng',
  'lon',
  'longitude',
  'latitude',
  'gps',
  'coord',
  'address',
  'adresse',
  'rue',
  'street',
  'landmark',
  'repere',
  'card',
  'carte',
  'iban',
  'pan',
  'cvv',
  'momo',
  'mobile_money',
  'payer_message',
  'note',
  'comment',
  'message',
  'query',
  'search_term',
] as const;

/**
 * Valeurs qui ressemblent à une donnée personnelle, quel que soit le nom de la
 * clé. Le nom peut être innocent (`ref`, `value`) et la valeur ne pas l'être.
 */
export const PII_VALUE_PATTERNS: readonly RegExp[] = [
  /**
   * Numéro congolais — `06 XXX XX XX`, neuf chiffres, avec ou sans séparateurs
   * et avec ou sans indicatif `+242`.
   *
   * Le zéro (ou l'indicatif) est **obligatoire** : sans lui, huit chiffres
   * consécutifs suffiraient à faire rejeter un libellé légitime.
   */
  /(?:\+?242[\s.-]*0?|0)[456](?:[\s.-]*\d){7}/,
  /** Jeton JWT (Firebase ID token, session). */
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./,
  /** Adresse e-mail. */
  /[^\s@]+@[^\s@]+\.[^\s@]{2,}/,
] as const;

/** Longueur maximale d'une valeur texte transmise. Au-delà, on tronque. */
export const MAX_STRING_LENGTH = 100;
