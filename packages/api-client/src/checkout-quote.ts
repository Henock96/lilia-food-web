import type { CheckoutQuote } from '@lilia/types';

export type VerifiedCheckoutQuote = CheckoutQuote & { quoteFingerprint: string };
const xaf = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

/** Reject unknown/partial quotes; no local estimate may authorize a checkout. */
export function isVerifiedCheckoutQuote(value: unknown): value is VerifiedCheckoutQuote {
  if (!record(value) || typeof value.restaurantId !== 'string' || !value.restaurantId ||
      typeof value.quoteFingerprint !== 'string' || !/^v1:[a-f0-9]{64}$/.test(value.quoteFingerprint)) return false;
  const { subTotal, deliveryFee, deliveryFeeBeforePromo, serviceFee, total, loyalty, promo, vendorOffer } = value;
  if (!xaf(subTotal) || !xaf(deliveryFee) || !xaf(deliveryFeeBeforePromo) || !xaf(serviceFee) || !xaf(total) ||
      !record(loyalty) || !xaf(loyalty.pointsUsed) || !xaf(loyalty.discountXaf)) return false;
  if (promo !== null && (!record(promo) || typeof promo.code !== 'string' || !xaf(promo.discountXaf) || !xaf(promo.deliveryDiscountXaf))) return false;
  if (vendorOffer !== null && (!record(vendorOffer) || typeof vendorOffer.id !== 'string' || typeof vendorOffer.label !== 'string' || !xaf(vendorOffer.discountXaf))) return false;
  const offerDiscount = vendorOffer === null ? 0 : vendorOffer.discountXaf as number;
  const promoDiscount = promo === null ? 0 : promo.discountXaf as number;
  const sum = subTotal + deliveryFee + serviceFee;
  return Number.isSafeInteger(sum) && deliveryFee <= deliveryFeeBeforePromo &&
    (promo === null ? deliveryFeeBeforePromo === deliveryFee : promo.deliveryDiscountXaf === deliveryFeeBeforePromo - deliveryFee) &&
    total === Math.max(0, sum - offerDiscount - promoDiscount - loyalty.discountXaf);
}
