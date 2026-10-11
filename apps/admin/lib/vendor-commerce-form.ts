/**
 * Étape « commerce » de l'assistant vendeur — logique pure, testée
 * (`vendor-commerce-form.test.ts`).
 *
 * R-09 — la commission fixe ce que touche le vendeur : elle ne part plus dans
 * `PATCH /admin/vendors/:id/commerce` (le serveur refuse une commission
 * différente en 409), mais en **demande** qu'un second administrateur
 * approuve (`POST /admin/vendors/:id/commission-change`). Le minimum de
 * commande reste direct.
 */

export type CommercePlan =
  | {
      ok: true;
      /** PATCH commerce, ou `null` s'il n'y a rien d'ordinaire à écrire. */
      commerce: { minimumOrderAmount: number } | null;
      /** Commission à demander ; `undefined` = inchangée, `null` = taux plateforme. */
      commission: number | null | undefined;
    }
  | { ok: false; error: string };

export function planCommerceSave(
  input: { commission: string; minOrder: string },
  vendor: { commissionPercent?: number | null; minimumOrderAmount: number },
): CommercePlan {
  const raw = input.commission.trim();
  let commission: number | null;
  if (raw === '') {
    commission = null;
  } else if (/^\d+,\d+$/.test(raw)) {
    return { ok: false, error: 'Commission : utilisez un point pour les décimales (ex : 7.5).' };
  } else if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: `Commission : nombre attendu (« ${raw} » n'en est pas un).` };
  } else if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return { ok: false, error: 'Commission : deux décimales au plus.' };
  } else {
    commission = Number(raw);
    if (commission > 50) return { ok: false, error: 'Commission : 50 % au plus.' };
  }

  const minRaw = input.minOrder.trim();
  if (!/^\d+$/.test(minRaw)) {
    return {
      ok: false,
      error: 'Montant minimum de commande : un nombre entier de FCFA.',
    };
  }
  const minimumOrderAmount = Number(minRaw);

  return {
    ok: true,
    commerce:
      minimumOrderAmount !== vendor.minimumOrderAmount ? { minimumOrderAmount } : null,
    commission: commission === (vendor.commissionPercent ?? null) ? undefined : commission,
  };
}
