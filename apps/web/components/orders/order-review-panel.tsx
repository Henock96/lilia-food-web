'use client';

import { useState } from 'react';
import { CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateDeliveryReview,
  useCreateOrderReview,
  type AuthCredential,
} from '@lilia/api-client';
import type { OrderReviewVerdict, ReviewSlot } from '@lilia/types';

import { useSessionGuard } from '@/lib/auth-session';

const MAX_COMMENT = 1000;

/**
 * Lot B — « Notez votre commande » : le vendeur et, pour une livraison, le
 * livreur. Chaque case suit le verdict du serveur (`CAN` / `DONE` / `NO`) :
 * une commande close par le support ou remise sans code n'affiche rien.
 */
export function OrderReviewPanel({
  orderId,
  restaurantId,
  restaurantName,
  deliveryId,
  verdict,
  token,
}: {
  orderId: string;
  restaurantId: string;
  restaurantName?: string;
  deliveryId?: string | null;
  verdict: OrderReviewVerdict | undefined;
  token: AuthCredential | null;
}) {
  const vendor = verdict?.vendor ?? 'NO';
  const driver = deliveryId ? (verdict?.driver ?? 'NO') : 'NO';
  if (vendor === 'NO' && driver === 'NO') return null;

  return (
    <div className="bg-white border border-cream-300 rounded-2xl p-4 mb-3 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-ink-900">Notez votre commande</h2>
      <ReviewSlotForm
        slot={vendor}
        label={restaurantName ? `La boutique · ${restaurantName}` : 'La boutique'}
        kind="vendor"
        orderId={orderId}
        restaurantId={restaurantId}
        token={token}
      />
      {deliveryId && (
        <ReviewSlotForm
          slot={driver}
          label="Le livreur"
          kind="driver"
          orderId={orderId}
          restaurantId={restaurantId}
          deliveryId={deliveryId}
          token={token}
        />
      )}
    </div>
  );
}

function ReviewSlotForm({
  slot,
  label,
  kind,
  orderId,
  restaurantId,
  deliveryId,
  token,
}: {
  slot: ReviewSlot;
  label: string;
  kind: 'vendor' | 'driver';
  orderId: string;
  restaurantId: string;
  deliveryId?: string;
  token: AuthCredential | null;
}) {
  const isCurrentSession = useSessionGuard();
  const vendorMut = useCreateOrderReview(token, orderId);
  const driverMut = useCreateDeliveryReview(token, orderId);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  if (slot === 'NO') return null;
  if (slot === 'DONE') {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-700">
        <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
        {label} : merci, votre note est enregistrée.
      </p>
    );
  }

  const pending = vendorMut.isPending || driverMut.isPending;

  async function submit() {
    if (!isCurrentSession() || rating < 1) return;
    const trimmed = comment.trim() || undefined;
    try {
      if (kind === 'vendor') {
        await vendorMut.mutateAsync({ restaurantId, rating, comment: trimmed });
      } else if (deliveryId) {
        await driverMut.mutateAsync({ deliveryId, rating, comment: trimmed });
      }
      if (!isCurrentSession()) return;
      toast.success('Merci pour votre note !');
    } catch (err: unknown) {
      if (!isCurrentSession()) return;
      const msg = (err as { message?: string }).message;
      toast.error(msg || 'Envoi impossible, réessayez.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink-700">{label}</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={`Note : ${label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === rating}
            aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="p-1"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                i <= (hover || rating) ? 'text-amber-500 fill-amber-500' : 'text-ink-300 fill-transparent'
              }`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="Un mot sur votre expérience (optionnel)"
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-cream-300 bg-white text-ink-900 placeholder-ink-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            className="self-end px-4 py-2 text-sm font-medium rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60"
          >
            {pending ? 'Envoi…' : 'Envoyer ma note'}
          </button>
        </>
      )}
    </div>
  );
}
