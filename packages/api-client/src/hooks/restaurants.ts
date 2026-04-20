'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Restaurant, Review, ReviewStats } from '@lilia/types';
import { apiClient } from '../client';

export const restaurantKeys = {
  all: ['restaurants'] as const,
  list: () => [...restaurantKeys.all, 'list'] as const,
  detail: (id: string) => [...restaurantKeys.all, 'detail', id] as const,
  reviews: (id: string) => [...restaurantKeys.all, 'reviews', id] as const,
  reviewStats: (id: string) => [...restaurantKeys.all, 'review-stats', id] as const,
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
