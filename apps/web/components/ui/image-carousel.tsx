'use client';

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/cloudinary-image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@lilia/utils';

interface ImageCarouselProps {
  images: { url: string; alt: string }[];
  /** Classes du conteneur (hauteur, etc.). */
  className?: string;
  /** Priorité de chargement de la 1re image (LCP). */
  priority?: boolean;
  sizes?: string;
  thumbnails?: boolean;
  /** Rendu si aucune image. */
  fallback?: ReactNode;
}

/**
 * Carrousel d'images réutilisable (hero restaurant, etc.).
 * - 1 image → affichage simple
 * - plusieurs → flèches + indicateurs (dots) + swipe tactile
 */
export function ImageCarousel({
  images,
  className,
  priority,
  sizes = '100vw',
  thumbnails = false,
  fallback,
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  // Une image de galerie vendeur peut mourir (URL tierce périssable —
  // cf. commentaires next.config.ts) : si TOUTES les images échouent au
  // chargement, on bascule sur le même fallback que « pas d'image du tout »
  // (aplat à initiale côté appelant), jamais l'icône de lien cassé. Même
  // traitement que `restaurant-card.tsx` / `vendor-card.tsx`.
  const [broken, setBroken] = useState<Set<number>>(() => new Set());

  if (images.length === 0) return <>{fallback ?? null}</>;
  if (broken.size >= images.length) return <>{fallback ?? null}</>;

  const count = images.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
  }

  return (
    <>
      <div
        className={cn('relative overflow-hidden', className)}
        onPointerDown={count > 1 ? onPointerDown : undefined}
        onPointerUp={count > 1 ? onPointerUp : undefined}
      >
        {/* Track */}
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative h-full w-full flex-shrink-0">
              <Image
                src={img.url}
                alt={img.alt}
                fill
                // Galerie vendeur = URLs externes arbitraires → chargeur dédié
                // (allowlist next/image conservée pour les visuels curés).
                loader={cloudinaryLoader}
                className="object-cover"
                // `preload` remplace `priority` (déprécié en Next 16), même effet.
                // Gardé plutôt que `eager` + `fetchPriority` : mesuré le
                // 08/11/2026 sur 3 fiches vendeur en 4G lente, le préchargement
                // donne un LCP plus court à chaque fois (~3,3 s contre ~3,9 s).
                preload={priority && i === 0}
                sizes={sizes}
                onError={() => setBroken((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Flèches */}
            <button
              type="button"
              aria-label="Image précédente"
              onClick={() => go(index - 1)}
              className="absolute top-1/2 left-3 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Image suivante"
              onClick={() => go(index + 1)}
              className="absolute top-1/2 right-3 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {!thumbnails && (
              <div className="absolute right-0 bottom-3 left-0 z-10 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Aller à l'image ${i + 1}`}
                    onClick={() => go(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80',
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {thumbnails && count > 1 && (
        <div
          className="mt-3 flex gap-3 overflow-x-auto px-1 py-1"
          role="group"
          aria-label="Photos du produit"
        >
          {images.map(
            (img, i) =>
              !broken.has(i) && (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Afficher la photo ${i + 1}`}
                  aria-pressed={index === i}
                  className={cn(
                    'relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2',
                    index === i
                      ? 'border-tomato-600'
                      : 'hover:border-tomato-200 border-transparent',
                  )}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    loader={cloudinaryLoader}
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ),
          )}
        </div>
      )}
    </>
  );
}
