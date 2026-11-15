'use client';
import type { AuthCredential } from '../auth-session';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '../session-query';
import type {
  AdminDeliveryReviewRow,
  AdminReviewRow,
  CreateDeliveryReviewDto,
  CreateReviewDto,
  Review,
  ReviewVisibilityFilter,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';
import { orderKeys } from './orders';
import { restaurantKeys, reviewKeys } from './restaurants';

/**
 * Lot B (15/11/2026) — avis par commande et modération.
 *
 * Le client note depuis le détail de sa commande, quand le serveur publie
 * `order.review.vendor|driver === 'CAN'` : la règle de preuve n'est jamais
 * recopiée ici.
 */

/** Note du vendeur rattachée à une commande livrée. */
export function useCreateOrderReview(token: AuthCredential | null, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Omit<CreateReviewDto, 'orderId'>) =>
      apiClient<Review>('/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify({ ...dto, orderId }),
      }),
    onSuccess: (_r, dto) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.canReview(dto.restaurantId) });
    },
  });
}

/** Note du livreur d'une course livrée (absente du web jusqu'au lot B). */
export function useCreateDeliveryReview(token: AuthCredential | null, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDeliveryReviewDto) =>
      apiClient<unknown>('/delivery-reviews', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
  });
}

// ─── Modération (back-office) ────────────────────────────────────────────────

export type ModerationTarget = 'REVIEW' | 'VENDOR_REPLY' | 'DELIVERY_REVIEW';

export interface ReviewModerationFilters {
  rating?: number | null;
  visibility?: ReviewVisibilityFilter;
}

export const reviewModerationKeys = {
  all: ['admin', 'review-moderation'] as const,
  reviews: (f: ReviewModerationFilters, page: number) =>
    [...reviewModerationKeys.all, 'reviews', f.rating ?? null, f.visibility ?? 'all', page] as const,
  deliveryReviews: (f: ReviewModerationFilters, page: number) =>
    [...reviewModerationKeys.all, 'delivery', f.rating ?? null, f.visibility ?? 'all', page] as const,
};

export interface ModerationPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function moderationListPath(
  kind: 'reviews' | 'delivery-reviews',
  f: ReviewModerationFilters,
  page: number,
): string {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (f.rating) params.set('rating', String(f.rating));
  if (f.visibility && f.visibility !== 'all') params.set('visibility', f.visibility);
  return `/admin/review-moderation/${kind}?${params.toString()}`;
}

/** Chemin du geste : avis, réponse du vendeur (sous l'avis) ou note livreur. */
export function moderationActionPath(
  target: ModerationTarget,
  id: string,
  action: 'hide' | 'unhide',
): string {
  const base = '/admin/review-moderation';
  const encoded = encodeURIComponent(id);
  if (target === 'DELIVERY_REVIEW') return `${base}/delivery-reviews/${encoded}/${action}`;
  if (target === 'VENDOR_REPLY') return `${base}/reviews/${encoded}/reply/${action}`;
  return `${base}/reviews/${encoded}/${action}`;
}

export function useAdminReviews(
  token: AuthCredential | null,
  filters: ReviewModerationFilters,
  page = 1,
) {
  return useQuery({
    queryKey: reviewModerationKeys.reviews(filters, page),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClientRaw<ModerationPage<AdminReviewRow>>(moderationListPath('reviews', filters, page), {
        signal,
        token,
      }),
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useAdminDeliveryReviews(
  token: AuthCredential | null,
  filters: ReviewModerationFilters,
  page = 1,
) {
  return useQuery({
    queryKey: reviewModerationKeys.deliveryReviews(filters, page),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClientRaw<ModerationPage<AdminDeliveryReviewRow>>(
        moderationListPath('delivery-reviews', filters, page),
        { signal, token },
      ),
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export interface ModerationInput {
  target: ModerationTarget;
  id: string;
  action: 'hide' | 'unhide';
  /** Obligatoire pour masquer (5 à 300 caractères, vérifié par le serveur). */
  reason?: string;
}

export function useModerateReview(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, id, action, reason }: ModerationInput) =>
      apiClient<{ id: string; hidden: boolean }>(moderationActionPath(target, id, action), {
        method: 'POST',
        token,
        body: action === 'hide' ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reviewModerationKeys.all }),
  });
}
