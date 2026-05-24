'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { orderKeys } from './orders';

export interface CreatePaymentDto {
  orderId: string;
  phoneNumber: string;
  payerMessage?: string;
}

export interface PaymentCreatedResult {
  paymentId: string;
  mode: 'MANUAL' | 'SANDBOX' | 'MTN_PRODUCTION';
  /** Mode MANUAL renvoie aussi `instructions`. */
  instructions?: {
    message: string;
    reference: string;
    paymentPhone?: string;
  };
}

/**
 * Crée un paiement `PENDING` côté backend pour une commande déjà créée.
 *
 * Doit être appelé **immédiatement après** `useCreateOrder` afin que le
 * paiement apparaisse dans l'admin "Paiements en attente" (mode MANUAL,
 * voir `payment.service.ts::createManualPayment`).
 *
 * Le backend bloque les paiements en doublon (`assertNoPendingPayment`),
 * donc un retry est sûr — mais on capture l'erreur côté UI pour ne pas
 * supprimer la commande déjà créée.
 */
export function useCreatePayment(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePaymentDto) =>
      apiClient<PaymentCreatedResult>('/payments', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
    },
  });
}
