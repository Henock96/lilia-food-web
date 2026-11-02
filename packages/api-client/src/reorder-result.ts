import { ApiError } from './client';

export interface ReorderItemResult {
  productId?: string;
  menuId?: string;
  productName?: string;
  reason?: string;
  code?: string;
  quantity?: number;
  availableQuantity?: number;
}

/** Counts are server-side line results, not quantities or cart totals. */
export interface ReorderResult {
  summary: { totalAdded: number; totalUnavailable: number; totalErrors: number };
  details: { added: ReorderItemResult[]; unavailable: ReorderItemResult[]; errors: ReorderItemResult[] };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseReorderResult(value: unknown): ReorderResult {
  const fail = () => new ApiError(502,
    'Le résultat du réachat est incomplet. Vérifiez votre panier avant de réessayer.',
    'INVALID_REORDER_RESULT');
  if (!record(value) || !record(value.summary) || !record(value.details)) throw fail();
  const pairs = [['totalAdded', 'added'], ['totalUnavailable', 'unavailable'], ['totalErrors', 'errors']] as const;
  for (const [countKey, itemsKey] of pairs) {
    const count = value.summary[countKey];
    const items = value.details[itemsKey];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 ||
        !Array.isArray(items) || count !== items.length ||
        items.some(item => !record(item) || ['productName', 'reason', 'code'].some(key => item[key] !== undefined && typeof item[key] !== 'string'))) {
      throw fail();
    }
  }
  return value as unknown as ReorderResult;
}
