'use client';

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@lilia/utils';

interface ImageCarouselProps {
  images: { url: string; alt: string }[];
  /** Classes du conteneur (hauteur, etc.). */
  className?: string;
  /** Priorité de chargement de la 1re image (LCP). */
  priority?: boolean;
  sizes?: string;
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
  fallback,
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  if (images.length === 0) return <>{fallback ?? null}</>;

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
              // Galerie vendeur = URLs externes arbitraires → unoptimized
              // (allowlist next/image conservée pour les visuels curés).
              unoptimized
              className="object-cover"
              priority={priority && i === 0}
              sizes={sizes}
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
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Indicateurs */}
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
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
        </>
      )}
    </div>
  );
}
