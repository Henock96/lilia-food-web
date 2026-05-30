'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Restaurant, Review, ReviewStats, VendorType } from '@lilia/types';
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
