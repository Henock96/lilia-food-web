'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Restaurant, Review, ReviewStats, VendorType,
  CreateReviewDto, UpdateReviewDto, CanReviewResult,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const restaurantKeys = {
  all: ['restaurants'] as const,
  list: () => [...restaurantKeys.all, 'list'] as const,
  detail: (id: string) => [...restaurantKeys.all, 'detail', id] as const,
  reviews: (id: string) => [...restaurantKeys.all, 'reviews', id] as const,
  reviewStats: (id: string) => [...restaurantKeys.all, 'review-stats', id] as const,
  vendors: (vendorType: VendorType | null) =>
    [...restaurantKeys.all, 'vendors', vendorType] as const,
};

export const reviewKeys = {
  canReview: (restaurantId: string) => ['reviews', 'can-review', restaurantId] as const,
  myReview: (restaurantId: string) => ['reviews', 'my-review', restaurantId] as const,
};

export function useRestaurants() {
  return useQuery({
    queryKey: restaurantKeys.list(),
    queryFn: () => apiClient<Restaurant[]>('/restaurants'),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: restaurantKeys.detail(id),
    queryFn: () => apiClient<Restaurant>(`/restaurants/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantReviews(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.reviews(restaurantId),
    queryFn: () => apiClient<Review[]>(`/reviews/restaurant/${restaurantId}`),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantReviewStats(restaurantId: string) {
  return useQuery({
    queryKey: restaurantKeys.reviewStats(restaurantId),
    queryFn: () => apiClient<ReviewStats>(`/reviews/restaurant/${restaurantId}/stats`),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePopularRestaurants() {
  return useQuery({
    queryKey: [...restaurantKeys.all, 'popular'] as const,
    queryFn: () => apiClient<Restaurant[]>('/restaurants/popular'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Marketplace public multi-vendeurs (LIL-119). Hit `GET /vendors` qui filtre
 * déjà adminApproved + isActive côté backend. Passe `vendorType` pour la
 * facette (HOME_COOK, BAKERY, BEVERAGE_SHOP, etc.). `null` = "Tous".
 *
 * Backend renvoie `{ data, meta }` — on extrait juste data ici car le client
 * web n'utilise pas la pagination (limit=50 suffit pour le MVP marketplace).
 */
export function useVendors(vendorType: VendorType | null = null) {
  return useQuery({
    queryKey: restaurantKeys.vendors(vendorType),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (vendorType) params.set('vendorType', vendorType);
      const res = await apiClientRaw<{ data: Restaurant[] }>(
        `/vendors?${params.toString()}`,
      );
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useToggleRestaurantOpen(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restaurantId: string) =>
      apiClient<Restaurant>(`/restaurants/${restaurantId}/toggle-open`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.list() });
    },
  });
}

export function useCanReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.canReview(restaurantId),
    queryFn: () =>
      apiClient<CanReviewResult>(`/reviews/restaurant/${restaurantId}/can-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000,
  });
}

export function useMyReview(restaurantId: string, token: string | null) {
  return useQuery({
    queryKey: reviewKeys.myReview(restaurantId),
    queryFn: () =>
      apiClient<Review | null>(`/reviews/restaurant/${restaurantId}/my-review`, { token }),
    enabled: !!token && !!restaurantId,
    staleTime: 60_000,
  });
}

export function useCreateReview(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReviewDto) =>
      apiClient<Review>('/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: (_review, dto) => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.canReview(dto.restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(dto.restaurantId) });
    },
  });
}

export function useUpdateReview(token: string | null, restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & UpdateReviewDto) =>
      apiClient<Review>(`/reviews/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}

export function useDeleteReview(token: string | null, restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ success: boolean }>(`/reviews/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviews(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.reviewStats(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.canReview(restaurantId) });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(restaurantId) });
    },
  });
}
