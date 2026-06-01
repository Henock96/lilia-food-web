'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PhotoGalleryEditor } from '@/components/photo-gallery-editor';
import { useAuthStore } from '@/store/auth';

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthStore();

  return (
    <div className="max-w-5xl space-y-5">
      <Link
        href="/restaurants"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={14} /> Retour aux restaurants
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Restaurant {id}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gestion de la galerie photos.
        </p>
      </header>

      <section className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Photos
        </h2>
        <PhotoGalleryEditor entity="vendor" parentId={id} token={token} />
      </section>
    </div>
  );
}
