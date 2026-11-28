import { Star } from 'lucide-react';
import { formatRelativeTime, getInitials } from '@lilia/utils';
import { getVendorReviews } from '@/lib/vendor-reviews';
import { LeaveReviewForm } from './leave-review-form';

interface RestaurantReviewsProps {
  restaurantId: string;
  title?: string;
}

export async function RestaurantReviews({ restaurantId, title = 'Avis clients' }: RestaurantReviewsProps) {
  const { stats, reviews } = await getVendorReviews(restaurantId);

  if (!stats || reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-ink-100 p-5">
        <LeaveReviewForm restaurantId={restaurantId} />
        <h2 className="mb-4 font-display text-xl font-extrabold text-ink-900">{title}</h2>
        <p className="text-sm text-ink-500">Aucun avis pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-ink-100 p-5">
      <LeaveReviewForm restaurantId={restaurantId} />
      <h2 className="mb-4 font-display text-xl font-extrabold text-ink-900">{title}</h2>

      {/* Stats globales */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-cream-300">
        <div className="text-center">
          <div className="text-4xl font-black text-ink-900">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i <= Math.round(stats.averageRating) ? 'text-warning fill-warning' : 'text-cream-300 fill-cream-300'}`}
              />
            ))}
          </div>
          <div className="text-xs text-ink-500 mt-1">{stats.totalReviews} avis</div>
        </div>

        {/* Barres de répartition */}
        <div className="flex-1 flex flex-col gap-1">
          {[5, 4, 3, 2, 1].map((star) => {
            // Lot B : le serveur envoie `ratingDistribution` ; `distribution`
            // n'a jamais existé, les barres restaient vides.
            const count =
              (stats.ratingDistribution ?? stats.distribution)?.[star.toString()] ?? 0;
            const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-ink-500 w-2">{star}</span>
                <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des avis */}
      <div className="flex flex-col divide-y divide-ink-100">
        {reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="flex flex-col gap-1.5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-tomato-100 flex items-center justify-center text-xs font-bold text-tomato-700">
                  {review.user ? getInitials(review.user.nom) : '?'}
                </div>
                <span className="text-sm font-medium text-ink-900">
                  {review.user?.nom ?? 'Client'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i <= review.rating ? 'text-warning fill-warning' : 'text-cream-300 fill-cream-300'}`}
                  />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-xs text-ink-700 leading-relaxed line-clamp-3">{review.comment}</p>
            )}
            {review.vendorReply && (
              <div className="ml-4 pl-3 border-l-2 border-cream-300">
                <p className="text-xs font-medium text-ink-900">Réponse de la boutique</p>
                <p className="text-xs text-ink-700 leading-relaxed line-clamp-4">{review.vendorReply}</p>
              </div>
            )}
            <span className="text-xs text-ink-500">{formatRelativeTime(review.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
