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
import { Loader2, Star, Trash2, Pencil, Plus, ImageOff } from 'lucide-react';
import { uploadToCloudinary, type UploadFolder } from '@/lib/cloudinary-upload';
import { apiMessage } from '@/lib/api-message';

/** `EntityType` (vendor/product/menu) → dossier Cloudinary accepté par le backend. */
const ENTITY_FOLDER: Record<EntityType, UploadFolder> = {
  vendor: 'restaurants',
  product: 'products',
  menu: 'menus',
};

const MAX_PHOTOS = 5;

type Props = {
  entity: EntityType;
  parentId: string;
  token: string | null;
};

export function PhotoGalleryEditor({ entity, parentId, token }: Props) {
  // `'manage'` — cet écran est un back-office. La vue publique applique la
  // frontière marketplace du vendeur et ne rend donc rien d'une boutique
  // suspendue, non validée ou en cours de configuration : la galerie
  // s'affichait vide alors qu'elle était peuplée, et une photo tout juste
  // ajoutée disparaissait au rafraîchissement. Cf. `PhotoScope`.
  const photosQuery = usePhotos(entity, parentId, token, 'manage');
  const upload = useUploadPhoto(entity, parentId, token);
  const update = useUpdatePhoto(entity, parentId, token, 'manage');
  const remove = useDeletePhoto(entity, parentId, token, 'manage');
  const reorder = useReorderPhotos(entity, parentId, token, 'manage');

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
    if (!token) {
      toast.error('Session expirée, reconnectez-vous.');
      return;
    }
    setIsUploading(true);
    try {
      const { secureUrl, publicId } = await uploadToCloudinary(
        file,
        token,
        ENTITY_FOLDER[entity],
      );
      await upload.mutateAsync({
        url: secureUrl,
        publicId,
        isCover: photos.length === 0, // premier upload = cover
      });
      toast.success('Photo ajoutée');
    } catch (err) {
      toast.error(apiMessage(err, "Échec de l'ajout de la photo"));
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
        onError: (err) =>
          toast.error(apiMessage(err, 'Impossible de réordonner la galerie')),
      },
    );
  }

  async function handleSetCover(photo: Photo) {
    if (photo.isCover) return;
    try {
      await update.mutateAsync({ photoId: photo.id, isCover: true });
      toast.success('Cover mis à jour');
    } catch (err) {
      toast.error(apiMessage(err, 'Impossible de définir la photo principale'));
    }
  }

  async function handleEditAlt(photo: Photo) {
    const alt = window.prompt('Description de la photo (alt) :', photo.alt ?? '');
    if (alt === null) return;
    try {
      await update.mutateAsync({ photoId: photo.id, alt: alt.trim() });
      toast.success('Description mise à jour');
    } catch (err) {
      toast.error(apiMessage(err, 'Impossible de modifier la description'));
    }
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm('Supprimer cette photo ? Cette action est définitive.')) return;
    try {
      await remove.mutateAsync(photo.id);
      toast.success('Photo supprimée');
    } catch (err) {
      toast.error(apiMessage(err, 'Impossible de supprimer la photo'));
    }
  }

  // ⚠️ `isLoading` vaut `false` tant que la requête est désactivée (token pas
  // encore hydraté depuis le store) : s'y fier seul faisait tomber l'écran sur
  // « Aucune photo » avant même d'avoir demandé quoi que ce soit — le même
  // « erreur indiscernable d'un vide » que la galerie corrigée ici.
  if (photosQuery.isLoading || (!token && photosQuery.isPending)) {
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
        {/* Le serveur dit *pourquoi* (« Vous n'êtes pas propriétaire de ce
            restaurant », « Produit introuvable ») ; le masquer derrière un
            libellé générique rendait chaque échec identique au suivant. */}
        <p className="text-center text-neutral-700">
          {apiMessage(photosQuery.error, 'Erreur de chargement de la galerie.')}
        </p>
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
  // Une URL Cloudinary révoquée, ou une photo importée à la main avec un lien
  // périmé, affichait l'icône de lien cassé du navigateur : indiscernable
  // d'une panne de la page. On rend l'état explicite — et la tuile reste
  // pilotable, c'est justement celle qu'il faut pouvoir supprimer.
  const [broken, setBroken] = useState(!photo.url?.trim());

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
        {broken ? (
          <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-neutral-400">
            <ImageOff className="size-5" />
            <span className="text-[10px] leading-tight">Image indisponible</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo.url}
            alt={photo.alt ?? ''}
            className="size-full object-cover"
            draggable={false}
            onError={() => setBroken(true)}
          />
        )}
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
