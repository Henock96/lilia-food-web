'use client';

import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  usePhotos,
  useUploadPhoto,
  useUpdatePhoto,
  useDeletePhoto,
  useReorderPhotos,
} from '@lilia/api-client';
import type { EntityType, Photo } from '@lilia/types';
import { toast } from 'sonner';
import { Loader2, Star, Trash2, Pencil, Plus } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';

const MAX_PHOTOS = 5;

type Props = {
  entity: EntityType;
  parentId: string;
  token: string | null;
};

export function PhotoGalleryEditor({ entity, parentId, token }: Props) {
  const photosQuery = usePhotos(entity, parentId, token);
  const upload = useUploadPhoto(entity, parentId, token);
  const update = useUpdatePhoto(entity, parentId, token);
  const remove = useDeletePhoto(entity, parentId, token);
  const reorder = useReorderPhotos(entity, parentId, token);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const photos = (photosQuery.data ?? []).slice().sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const atMax = photos.length >= MAX_PHOTOS;

  async function handleFile(file: File | null) {
    if (!file) return;
    if (atMax) {
      toast.error(`Maximum ${MAX_PHOTOS} photos atteint`);
      return;
    }
    setIsUploading(true);
    try {
      const { secureUrl, publicId } = await uploadToCloudinary(file);
      await upload.mutateAsync({
        url: secureUrl,
        publicId,
        isCover: photos.length === 0, // premier upload = cover
      });
      toast.success('Photo ajoutée');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(photos, oldIndex, newIndex);
    reorder.mutate(
      next.map((p) => p.id),
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : 'Erreur reorder';
          toast.error(msg);
        },
      },
    );
  }

  async function handleSetCover(photo: Photo) {
    if (photo.isCover) return;
    try {
      await update.mutateAsync({ photoId: photo.id, isCover: true });
      toast.success('Cover mis à jour');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur cover';
      toast.error(msg);
    }
  }

  async function handleEditAlt(photo: Photo) {
    const alt = window.prompt('Description de la photo (alt) :', photo.alt ?? '');
    if (alt === null) return;
    try {
      await update.mutateAsync({ photoId: photo.id, alt: alt.trim() });
      toast.success('Description mise à jour');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur alt';
      toast.error(msg);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm('Supprimer cette photo ? Cette action est définitive.')) return;
    try {
      await remove.mutateAsync(photo.id);
      toast.success('Photo supprimée');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur suppression';
      toast.error(msg);
    }
  }

  if (photosQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-md bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  if (photosQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-sm">
        <p>Erreur de chargement de la galerie.</p>
        <button
          type="button"
          onClick={() => photosQuery.refetch()}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {photos.length} / {MAX_PHOTOS} photos
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={atMax || isUploading}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          title={atMax ? 'Maximum 5 atteint' : 'Ajouter une photo'}
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Ajouter
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {photos.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-neutral-500">
          Aucune photo pour l&apos;instant.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {photos.map((photo) => (
                <SortablePhotoTile
                  key={photo.id}
                  photo={photo}
                  onSetCover={() => handleSetCover(photo)}
                  onEditAlt={() => handleEditAlt(photo)}
                  onDelete={() => handleDelete(photo)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

type TileProps = {
  photo: Photo;
  onSetCover: () => void;
  onEditAlt: () => void;
  onDelete: () => void;
};

function SortablePhotoTile({ photo, onSetCover, onEditAlt, onDelete }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-md border bg-white"
    >
      <div
        {...attributes}
        {...listeners}
        className="aspect-square w-full cursor-grab bg-neutral-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.alt ?? ''}
          className="size-full object-cover"
          draggable={false}
        />
      </div>
      {photo.isCover && (
        <div className="absolute left-2 top-2 rounded-full bg-amber-500/90 p-1 text-white shadow">
          <Star className="size-4 fill-white" />
        </div>
      )}
      <div className="flex items-center justify-between gap-1 border-t bg-white p-1.5">
        <button
          type="button"
          onClick={onSetCover}
          disabled={photo.isCover}
          title={photo.isCover ? 'Cover actuel' : 'Définir comme cover'}
          className="rounded p-1 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50"
        >
          <Star
            className={`size-4 ${photo.isCover ? 'fill-amber-400 text-amber-500' : 'text-neutral-500'}`}
          />
        </button>
        <button
          type="button"
          onClick={onEditAlt}
          title="Éditer la description"
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Supprimer"
          className="rounded p-1 text-red-500 hover:bg-red-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
