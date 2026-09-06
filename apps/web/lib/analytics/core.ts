/**
 * Cœur de l'abstraction analytics — sans aucune dépendance à Google.
 *
 * Le code métier n'appelle jamais `gtag`. Il appelle `analytics.track(...)`, et
 * ce fichier décide quoi en faire. Deux raisons, dans cet ordre d'importance :
 *
 *  1. **Le contrat est appliqué à un seul endroit.** Désinfection, liste
 *     blanche, déduplication : un appel qui contourne cette classe contourne
 *     les trois. C'est pourquoi les composants ne reçoivent jamais `gtag`.
 *  2. Changer d'outil de mesure devient un changement de collecteur, pas une
 *     réécriture de vingt écrans.
 *
 * Un collecteur (`AnalyticsSink`) est une destination : GA4, Clarity, la
 * console en développement, ou un tableau en test. La classe n'en connaît
 * aucune en particulier.
 */

import {
  CURRENCY,
  type AnalyticsEvent,
  type AnalyticsValue,
  type AnyParams,
  type EventParams,
} from './contract';
import { OnceRegistry, RepeatGuard, signature, type KeyValueStore } from './dedupe';
import { sanitizeParams } from './sanitize';

export interface AnalyticsSink {
  readonly name: string;
  event(name: AnalyticsEvent, params: Record<string, AnalyticsValue>): void;
  /** Associe les envois suivants à un identifiant interne, ou les délie (`null`). */
  identify?(userId: string | null): void;
}

export interface AnalyticsCoreOptions {
  sinks: AnalyticsSink[];
  store?: KeyValueStore | null;
  now?: () => number;
  /** Fenêtre d'absorption des rejeux d'interface, en millisecondes. */
  repeatWindowMs?: number;
  /** Signalé en développement quand un paramètre est retiré. */
  onDropped?: (event: AnalyticsEvent, dropped: { key: string; reason: string }[]) => void;
}

export class AnalyticsCore {
  private readonly sinks: AnalyticsSink[];
  private readonly guard: RepeatGuard;
  private readonly once: OnceRegistry;
  private readonly onDropped?: AnalyticsCoreOptions['onDropped'];

  constructor(options: AnalyticsCoreOptions) {
    this.sinks = options.sinks;
    this.guard = new RepeatGuard(options.repeatWindowMs ?? 1000, options.now);
    this.once = new OnceRegistry(options.store ?? null);
    this.onDropped = options.onDropped;
  }

  /**
   * Envoie un événement du contrat.
   *
   * Ne lève jamais : un collecteur en erreur ne doit pas interrompre un
   * paiement. Rend `true` si l'événement est parti — ce que les tests lisent.
   */
  track<E extends AnalyticsEvent>(event: E, params: EventParams<E> = {}): boolean {
    const { params: clean, dropped } = sanitizeParams(event, params as AnyParams);
    if (dropped.length > 0) this.onDropped?.(event, dropped);

    if (!this.guard.allow(signature(event, clean))) return false;

    this.emit(event, clean);
    return true;
  }

  /**
   * Envoie un événement **au plus une fois pour `dedupeKey`**, définitivement.
   *
   * Réservé aux faits métier qui ne se produisent qu'une fois : une commande
   * n'est créée qu'une fois, un paiement n'est confirmé qu'une fois. La clé
   * doit donc porter l'identifiant du fait (`payment_success:<paymentId>`), pas
   * celui de l'écran qui l'observe — plusieurs écrans peuvent l'observer, et
   * c'est précisément ce dont on se protège.
   */
  trackOnce<E extends AnalyticsEvent>(
    dedupeKey: string,
    event: E,
    params: EventParams<E> = {},
  ): boolean {
    if (!this.once.claim(dedupeKey)) return false;
    const { params: clean, dropped } = sanitizeParams(event, params as AnyParams);
    if (dropped.length > 0) this.onDropped?.(event, dropped);
    this.emit(event, clean);
    return true;
  }

  /**
   * Attache un identifiant interne aux envois suivants.
   *
   * ⚠️ **Jamais un numéro de téléphone, un e-mail ou un identifiant Firebase.**
   * On passe l'identifiant applicatif (`user.id`, le CUID de la base) : il est
   * stable, il permet de recoller les parcours web et mobile du même client, et
   * il ne désigne personne pour qui ne dispose pas déjà de la base.
   */
  identify(userId: string | null): void {
    for (const sink of this.sinks) {
      try {
        sink.identify?.(userId);
      } catch {
        // Silencieux par conception.
      }
    }
  }

  private emit(event: AnalyticsEvent, params: Record<string, AnalyticsValue>) {
    for (const sink of this.sinks) {
      try {
        sink.event(event, params);
      } catch {
        // Un collecteur en panne n'en empêche pas un autre, et n'interrompt rien.
      }
    }
  }
}

/* ─────────────────────── Fabriques de clés de dédoublonnage ──────────────── */

/**
 * Clés d'unicité métier. Centralisées pour que le web et le mobile appliquent
 * la même règle : l'unicité porte sur l'**objet métier**, pas sur l'écran.
 */
export const onceKey = {
  orderCreated: (orderId: string) => `order_created:${orderId}`,
  paymentStarted: (paymentId: string) => `payment_started:${paymentId}`,
  paymentSuccess: (paymentId: string) => `payment_success:${paymentId}`,
} as const;

export { CURRENCY };
