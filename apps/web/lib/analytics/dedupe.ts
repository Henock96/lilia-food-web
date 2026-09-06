/**
 * Déduplication — deux mécanismes, parce qu'il y a deux problèmes distincts.
 *
 * **1. Le bruit de cycle de vie** (`RepeatGuard`). React monte deux fois en
 * `StrictMode`, un `useEffect` se rejoue quand une dépendance change d'identité,
 * une navigation client-side de Next peut rendre deux fois. Ces rejeux sont
 * séparés de quelques millisecondes et portent une charge utile **identique**.
 * Une fenêtre courte sur la signature `événement + paramètres` les absorbe sans
 * masquer une seconde consultation réelle, qui arrive forcément plus tard.
 *
 * **2. L'unicité métier** (`OnceRegistry`). `payment_success` doit être compté
 * une fois par paiement, pour toujours : le client recharge la page de sa
 * commande, y revient depuis l'historique une semaine plus tard, ou reçoit un
 * webhook rejoué côté serveur. Une fenêtre de temps ne protège pas de ça — il
 * faut une trace persistante, indexée sur l'identifiant métier.
 *
 * Les deux structures reçoivent leur horloge et leur stockage par injection :
 * une garantie annoncée doit pouvoir être testée sans attendre.
 */

/** Signature stable d'un envoi — l'ordre des clés ne doit pas la changer. */
export function signature(event: string, params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);
  return `${event}|${entries.join('&')}`;
}

/**
 * Absorbe les rejeux d'interface : même signature, à moins de `windowMs`.
 *
 * ⚠️ La fenêtre est volontairement **courte** (une seconde). Une fenêtre longue
 * supprimerait de vraies consultations répétées — un client qui compare deux
 * fois la même fiche produit consulte bien deux fois.
 */
export class RepeatGuard {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly windowMs = 1000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** `true` si l'envoi doit être laissé passer. */
  allow(sig: string): boolean {
    const t = this.now();
    const last = this.seen.get(sig);
    if (last !== undefined && t - last < this.windowMs) return false;
    this.seen.set(sig, t);
    this.prune(t);
    return true;
  }

  /** Empêche la carte de croître indéfiniment sur une session longue. */
  private prune(t: number) {
    if (this.seen.size < 200) return;
    for (const [sig, at] of this.seen) {
      if (t - at >= this.windowMs) this.seen.delete(sig);
    }
  }
}

/** Abstraction minimale du stockage — `localStorage` en navigateur, une Map en test. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Registre des événements à envoi unique, persistant entre les visites.
 *
 * Les clés sont bornées (`maxKeys`, les plus anciennes sont oubliées) : un
 * client fidèle ne doit pas remplir le stockage local de son navigateur avec
 * l'historique de ses paiements. Oublier une clé très ancienne est sans
 * conséquence — l'événement correspondant date de plusieurs centaines de
 * commandes.
 */
export class OnceRegistry {
  private static readonly STORAGE_KEY = 'lilia-analytics-once';

  constructor(
    private readonly store: KeyValueStore | null,
    private readonly maxKeys = 200,
  ) {}

  /**
   * Réserve `key`. Rend `true` la première fois seulement.
   *
   * En l'absence de stockage (rendu serveur, navigateur en mode restreint) on
   * laisse passer : mieux vaut un doublon improbable qu'un paiement jamais
   * compté.
   */
  claim(key: string): boolean {
    if (!this.store) return true;
    const keys = this.read();
    if (keys.includes(key)) return false;
    keys.push(key);
    this.write(keys.slice(-this.maxKeys));
    return true;
  }

  private read(): string[] {
    try {
      const raw = this.store!.getItem(OnceRegistry.STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
    } catch {
      return [];
    }
  }

  private write(keys: string[]) {
    try {
      this.store!.setItem(OnceRegistry.STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Quota dépassé ou stockage refusé : la mesure ne bloque rien.
    }
  }
}
