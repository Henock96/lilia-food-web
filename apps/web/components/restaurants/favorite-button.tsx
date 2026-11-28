'use client';

import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@lilia/types';
import { cn } from '@lilia/utils';
import { useFavorites, useToggleFavorite } from '@lilia/api-client';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';

/**
 * Bouton favori : zone tactile de 44 × 44 px, pastille visuelle de 36 px.
 * Frère du lien de la carte et au-dessus de lui (`z-10`) — le clic ne navigue
 * pas, sans `preventDefault`.
 */
export function FavoriteButton({ restaurant }: { restaurant: Restaurant }) {
  const { token } = useAuthSession();
  const isCurrentSession = useSessionGuard();
  const { data: favorites } = useFavorites(token);
  const toggleFavorite = useToggleFavorite(token);
  const isFavorite = favorites?.some((f) => f.id === restaurant.id) ?? false;

  function handleClick() {
    if (!isCurrentSession()) return;
    if (!token) {
      toast.error('Connecte-toi pour garder tes vendeurs favoris.');
      return;
    }
    toggleFavorite.mutate(
      { restaurantId: restaurant.id, isFavorite, restaurant },
      {
        onSuccess: () => {
          if (!isCurrentSession()) return;
          toast.success(isFavorite ? 'Retiré de tes favoris' : 'Ajouté à tes favoris');
        },
        onError: () => {
          if (!isCurrentSession()) return;
          toast.error('Impossible de modifier tes favoris. Réessaie.');
        },
      },
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={`${restaurant.nom} dans mes favoris`}
      className="group/fav absolute top-0.5 right-0.5 z-10 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none! sm:top-1.5 sm:right-1.5"
    >
      <span className="ring-cream-300 group-hover/fav:ring-tomato-600 group-focus-visible/fav:ring-tomato-600 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition-colors group-focus-visible/fav:ring-2">
        <Heart
          aria-hidden
          className={cn(
            'h-4 w-4 transition-colors',
            isFavorite ? 'fill-tomato-600 text-tomato-600' : 'text-ink-500',
          )}
        />
      </span>
    </button>
  );
}
