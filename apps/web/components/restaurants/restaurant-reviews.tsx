import { Star } from 'lucide-react';
import { apiClient } from '@lilia/api-client';
import type { ReviewStats, Review } from '@lilia/types';
import { formatRelativeTime, getInitials } from '@lilia/utils';

interface RestaurantReviewsProps {
  restaurantId: string;
}

async function getReviewStats(id: string): Promise<ReviewStats | null> {
  'use cache';
  try {
    return await apiClient<ReviewStats>(`/reviews/restaurant/${id}/stats`);
  } catch {
    return null;
  }
}

async function getReviews(id: string): Promise<Review[]> {
  'use cache';
  try {
    return await apiClient<Review[]>(`/reviews/restaurant/${id}`);
  } catch {
    return [];
  }
}

export async function RestaurantReviews({ restaurantId }: RestaurantReviewsProps) {
  const [stats, reviews] = await Promise.all([
    getReviewStats(restaurantId),
    getReviews(restaurantId),
  ]);

  if (!stats || reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5">
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3">Avis clients</h3>
        <p className="text-sm text-zinc-400">Aucun avis pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5">
      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4">Avis clients</h3>

      {/* Stats globales */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-zinc-100 dark:border-dark-border">
        <div className="text-center">
          <div className="text-4xl font-black text-zinc-900 dark:text-zinc-100">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i <= Math.round(stats.averageRating) ? 'text-amber-500 fill-amber-500' : 'text-zinc-200 fill-zinc-200'}`}
              />
            ))}
          </div>
          <div className="text-xs text-zinc-400 mt-1">{stats.totalReviews} avis</div>
        </div>

        {/* Barres de répartition */}
        <div className="flex-1 flex flex-col gap-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution?.[star.toString()] ?? 0;
            const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-2">{star}</span>
                <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-dark-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des avis */}
      <div className="flex flex-col gap-4 max-h-80 overflow-y-auto">
        {reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
                  {review.user ? getInitials(review.user.nom) : '?'}
                </div>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {review.user?.nom ?? 'Client'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-200 fill-zinc-200'}`}
                  />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">{review.comment}</p>
            )}
            <span className="text-xs text-zinc-400">{formatRelativeTime(review.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
