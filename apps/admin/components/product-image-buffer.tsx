'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Star, Trash2, Plus } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';

export type DraftImage = { url: string; publicId: string; isCover: boolean };

const MAX_PHOTOS = 5;

type Props = {
  value: DraftImage[];
  onChange: (next: DraftImage[]) => void;
};

/**
 * Buffer d'images pour la création de produit : upload Cloudinary immédiat,
 * grille de previews. Les images sont rattachées au produit après sa création.
 * La 1ère image (ou celle marquée étoile) est la couverture.
 */
export function ProductImageBuffer({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const atMax = value.length >= MAX_PHOTOS;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const next = [...value];
    let failures = 0;
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      try {
        const { secureUrl, publicId } = await uploadToCloudinary(file);
        next.push({ url: secureUrl, publicId, isCover: next.length === 0 });
      } catch {
        failures++;
      }
    }
    onChange(next);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (failures > 0) toast.error(`${failures} image(s) non uploadée(s)`);
  }

  function setCover(index: number) {
    onChange(value.map((d, i) => ({ ...d, isCover: i === index })));
  }

  function remove(index: number) {
    const wasCover = value[index]?.isCover;
    const next = value.filter((_, i) => i !== index);
    if (wasCover && next.length > 0) next[0] = { ...next[0], isCover: true };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Photos {value.length} / {MAX_PHOTOS}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={atMax || isUploading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Ajouter
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-xs text-zinc-500">
          Aucune photo. Ajoutez-en jusqu&apos;à {MAX_PHOTOS}.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {value.map((d, index) => (
            <div
              key={d.publicId}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setCover(index)}
                title={d.isCover ? 'Couverture' : 'Définir comme couverture'}
                className="absolute left-1 top-1 rounded-full bg-black/40 p-1"
              >
                <Star className={`size-4 ${d.isCover ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                title="Supprimer"
                className="absolute right-1 top-1 rounded-full bg-black/40 p-1 text-red-300 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
