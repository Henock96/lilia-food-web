'use client';

import { useState } from 'react';
import { CheckCircle, KeyRound, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmPickup } from '@lilia/api-client';
import type { Order } from '@lilia/types';

import { pickupView } from '@/lib/pickup-view';

/**
 * Retrait au comptoir (F3-07) : le code à montrer, puis « J'ai récupéré ma
 * commande ». Même route que l'app mobile ; le serveur est idempotent, et le
 * bouton se retire de lui-même quand la remise est prouvée.
 */
export function PickupPanel({ order, token }: { order: Order; token: string | null }) {
  const confirmPickup = useConfirmPickup(token);
  const [asking, setAsking] = useState(false);
  const view = pickupView(order);
  if (!view) return null;

  async function confirm() {
    if (confirmPickup.isPending) return;
    try {
      await confirmPickup.mutateAsync(order.id);
      setAsking(false);
      toast.success('Commande récupérée. Bon appétit !');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Confirmation impossible. Réessayez.');
    }
  }

  if (view.proved) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium text-emerald-800 text-sm">Commande récupérée</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Votre commande a été confirmée comme retirée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-tomato-200 p-5 mb-4">
      {view.code && (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-700">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            Code de retrait
          </p>
          <p
            className="mt-2 text-4xl font-bold tracking-[0.4em] text-tomato-700"
            aria-label={`Code de retrait ${view.code.split('').join(' ')}`}
          >
            {view.code}
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Au comptoir, montrez ce code quand on vous remet votre commande —
            jamais avant.
          </p>
        </div>
      )}

      {view.canConfirm && (
        <div className={view.code ? 'mt-4 pt-4 border-t border-cream-200' : ''}>
          {view.vendorDeclared && (
            <p className="text-sm font-medium text-ink-900 mb-1">
              Le restaurant indique vous avoir remis votre commande.
            </p>
          )}
          {asking ? (
            <>
              <p className="text-sm text-ink-700 mb-3">
                Confirmez uniquement si vous avez bien récupéré votre commande
                auprès du restaurant.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  disabled={confirmPickup.isPending}
                  className="flex-1 py-3 border border-cream-300 text-ink-700 hover:bg-cream-100 font-medium text-sm rounded-2xl"
                >
                  Pas encore
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={confirmPickup.isPending}
                  className="flex-1 py-3 bg-tomato-600 hover:bg-tomato-700 text-white font-medium text-sm rounded-2xl disabled:opacity-60"
                >
                  {confirmPickup.isPending ? 'Confirmation…' : 'Oui, je l’ai'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-ink-500 mb-3">
                {view.code
                  ? 'Pas de code demandé au comptoir ? Une fois votre commande en main, confirmez-le ici.'
                  : 'Confirmez uniquement si vous avez bien récupéré votre commande auprès du restaurant.'}
              </p>
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="w-full py-3 bg-tomato-600 hover:bg-tomato-700 text-white font-medium text-sm rounded-2xl flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                J’ai récupéré ma commande
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
