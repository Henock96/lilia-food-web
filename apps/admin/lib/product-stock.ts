import type { Product, ProductVariant, StockPolicy, StockUnit } from '@lilia/types';

/**
 * F3-10 — politique de stock et formats multi-unités, côté back-office.
 *
 * Remplace « DAILY — reset chaque nuit / PERMANENT — stock réel » : trois
 * choix dits dans les mots du vendeur. Toute la traduction formulaire ↔ API
 * vit ici, testée, plutôt que dans la page.
 */

export const STOCK_POLICIES: Array<{
  value: StockPolicy;
  label: string;
  help: string;
  quantityLabel: string | null;
}> = [
  {
    value: 'UNLIMITED',
    label: 'Toujours disponible',
    help: 'Pas de limite : vous pouvez toujours en préparer.',
    quantityLabel: null,
  },
  {
    value: 'DAILY_QUOTA',
    label: 'Quantité du jour',
    help: 'Un nombre fixe chaque jour ; le compteur revient à ce nombre chaque matin à 5 h.',
    quantityLabel: 'Quantité préparée chaque jour',
  },
  {
    value: 'INVENTORY',
    label: 'Stock réel',
    help: 'Baisse à chaque vente, ne remonte que quand vous réapprovisionnez.',
    quantityLabel: 'Unités en stock',
  },
];

export const STOCK_UNITS: Record<StockUnit, [singular: string, plural: string]> = {
  PIECE: ['unité', 'unités'],
  PORTION: ['portion', 'portions'],
  BOTTLE: ['bouteille', 'bouteilles'],
  CAN: ['canette', 'canettes'],
  CUP: ['gobelet', 'gobelets'],
  BAG: ['sachet', 'sachets'],
};

/** « 6 bouteilles », « 1 portion ». */
export function formatUnits(units: number, unit: StockUnit = 'PIECE'): string {
  const [one, many] = STOCK_UNITS[unit] ?? STOCK_UNITS.PIECE;
  return `${units} ${units > 1 ? many : one}`;
}

/** Politique d'un produit ; déduite de l'ancien contrat si le serveur est antérieur. */
export function policyOf(p: Pick<Product, 'stockPolicy' | 'stockMode' | 'stockRestant'>): StockPolicy {
  if (p.stockPolicy) return p.stockPolicy;
  if (p.stockRestant == null) return 'UNLIMITED';
  return p.stockMode === 'PERMANENT' ? 'INVENTORY' : 'DAILY_QUOTA';
}

/** Libellé de la carte produit, dans l'unité du produit. */
export function stockLabel(p: Product): string {
  const policy = policyOf(p);
  if (policy === 'UNLIMITED') return 'Toujours disponible';
  const left = p.stockRestant ?? 0;
  if (left === 0) return 'Rupture';
  const units = formatUnits(left, p.stockUnit);
  return policy === 'DAILY_QUOTA' ? `${units} / ${p.stockQuotidien ?? '?'} aujourd’hui` : units;
}

/**
 * Les formats plus gros que le stock restant ne sont plus vendables, même si
 * le produit a encore du stock : 5 bouteilles, le carton de 6 est épuisé.
 */
export function unsellableFormats(p: Product): ProductVariant[] {
  return p.variants.filter((v) => v.stockStatus === 'OUT_OF_STOCK');
}

export interface StockFormFields {
  stockPolicy: StockPolicy;
  stockUnit: StockUnit;
  /** Quota ou niveau, en texte (champ de saisie). */
  stockQuantity: string;
}

export function initStockFields(p?: Product): StockFormFields {
  const policy = p ? policyOf(p) : 'UNLIMITED';
  return {
    stockPolicy: policy,
    stockUnit: p?.stockUnit ?? 'PIECE',
    stockQuantity: p?.stockQuotidien != null ? String(p.stockQuotidien) : '',
  };
}

/**
 * La quantité est-elle saisissable dans la fiche ? Pas pour un stock réel déjà
 * en place : il bouge par les gestes « Réapprovisionner » et « Inventaire »,
 * jamais par une réécriture de fiche qui perdrait les ventes faites
 * entre-temps.
 */
export function quantityEditable(fields: StockFormFields, product?: Product): boolean {
  if (fields.stockPolicy === 'UNLIMITED') return false;
  return !(product && fields.stockPolicy === 'INVENTORY' && policyOf(product) === 'INVENTORY');
}

/**
 * Champs de stock envoyés à `POST/PATCH /products`. `stockMode` part en double
 * pour un serveur antérieur à F3-10. Lève si une quantité requise manque.
 */
export function stockPayload(
  fields: StockFormFields,
  product?: Product,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    stockPolicy: fields.stockPolicy,
    stockMode: fields.stockPolicy === 'INVENTORY' ? 'PERMANENT' : 'DAILY',
    stockUnit: fields.stockUnit,
  };
  if (fields.stockPolicy === 'UNLIMITED') {
    payload.stockQuotidien = null;
    return payload;
  }
  const policyChanged = !product || policyOf(product) !== fields.stockPolicy;
  if (policyChanged || fields.stockPolicy === 'DAILY_QUOTA') {
    const n = Number(fields.stockQuantity.trim());
    if (fields.stockQuantity.trim() === '' || !Number.isInteger(n) || n < 0) {
      throw new Error('Indiquez un nombre entier d’unités.');
    }
    payload.stockQuotidien = n;
  }
  return payload;
}

/** Format dans le formulaire — `id` absent = création. */
export interface VariantDraft {
  _key: number;
  id?: string;
  label: string;
  prix: string;
  /** Unités de stock par format ; figé pour un format enregistré. */
  stockConsumption: string;
}

export function variantPayload(drafts: VariantDraft[]) {
  return drafts
    .filter((v) => v.prix)
    .map((v) => ({
      id: v.id,
      label: v.label.trim() || undefined,
      prix: parseFloat(v.prix),
      // Envoyée seulement pour un format neuf : immuable ensuite (le serveur
      // refuserait un changement, `STOCK_CONSUMPTION_IMMUTABLE`).
      ...(v.id ? {} : { stockConsumption: parseInt(v.stockConsumption || '1', 10) }),
    }));
}
