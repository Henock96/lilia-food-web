'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MessageSquareWarning, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, useOpenClaim } from '@lilia/api-client';
import type { ClaimReason, OrderItem } from '@lilia/types';

import { uploadToCloudinary } from '@/components/auth-provider';
import { CLAIM_REASONS, claimNeedsItems, itemLabel } from '@/lib/claims';

const MAX_PHOTOS = 3;

/**
 * « Un problème avec ma commande ? » (F3-06) — commande livrée, 24 h.
 *
 * Le client dit ce qu'il constate : un motif, les articles concernés, une
 * photo s'il en a. Le montant n'est jamais calculé ici : le service client
 * décide, et la réponse arrive dans « Mes demandes ».
 */
export function ClaimPanel({
  orderId,
  items,
  token,
}: {
  orderId: string;
  items: OrderItem[];
  token: string | null;
}) {
  const router = useRouter();
  const openClaim = useOpenClaim(token, orderId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ClaimReason | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const chosenItems = Object.entries(selected)
    .filter(([, qty]) => qty > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
  const needsItems = reason ? claimNeedsItems(reason) : false;
  const canSubmit =
    !!reason && (!needsItems || chosenItems.length > 0) && !uploading && !openClaim.isPending;

  async function addPhoto(file: File | undefined) {
    if (!file || !token || photos.length >= MAX_PHOTOS) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, token, 'claims');
      setPhotos((p) => [...p, url]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Photo non envoyée.');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!reason) return;
    try {
      const claim = await openClaim.mutateAsync({
        reason,
        ...(chosenItems.length ? { items: chosenItems } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(photos.length ? { photoUrls: photos } : {}),
      });
      toast.success('Demande envoyée. Le service client vous répond ici.');
      router.push(`/demandes/${claim.id}`);
    } catch (e) {
      // Une demande est déjà ouverte : on y mène plutôt que d'en ouvrir une autre.
      const claimId = e instanceof ApiError ? e.details?.claimId : undefined;
      if (e instanceof ApiError && e.code === 'CLAIM_ALREADY_OPEN' && typeof claimId === 'string') {
        router.push(`/demandes/${claimId}`);
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Demande impossible.');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-4 flex items-center justify-center gap-2 rounded-2xl border border-cream-300 py-3 text-sm font-semibold text-ink-700 hover:bg-cream-100"
      >
        <MessageSquareWarning className="w-4 h-4" aria-hidden="true" />
        Un problème avec ma commande ?
      </button>
    );
  }

  return (
    <fieldset className="bg-white rounded-2xl border border-cream-200 p-5 mb-4">
      <legend className="font-semibold text-ink-900 text-sm px-1">Un problème avec ma commande ?</legend>
      <p className="text-xs text-ink-500 mt-1">
        Possible jusqu’à 24 h après la livraison. Le service client vous répond dans « Mes demandes ».
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {CLAIM_REASONS.map((r) => (
          <label key={r.reason} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="claim-reason"
              checked={reason === r.reason}
              onChange={() => setReason(r.reason)}
            />
            {r.label}
          </label>
        ))}
      </div>

      {reason && (
        <div className="mt-4">
          <p className="text-sm font-medium text-ink-700">
            {needsItems ? 'Quels articles ?' : 'Articles concernés (facultatif)'}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {items.map((it) => {
              const qty = selected[it.id] ?? 0;
              return (
                <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                  <label className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={qty > 0}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, [it.id]: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span className="truncate">{itemLabel(it)}</span>
                  </label>
                  {qty > 0 && it.quantite > 1 && (
                    <select
                      value={qty}
                      onChange={(e) => setSelected((s) => ({ ...s, [it.id]: Number(e.target.value) }))}
                      className="rounded-lg border border-cream-300 px-2 py-1 text-sm"
                      aria-label={`Quantité pour ${itemLabel(it)}`}
                    >
                      {Array.from({ length: it.quantite }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} sur {it.quantite}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Racontez-nous (facultatif)"
        className="mt-4 w-full rounded-xl border border-cream-300 p-3 text-sm"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {photos.map((url) => (
          <span key={url} className="flex items-center gap-1 rounded-lg bg-cream-100 px-2 py-1 text-xs">
            Photo jointe
            <button
              type="button"
              aria-label="Retirer la photo"
              onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-cream-300 px-2 py-1 text-xs text-ink-700">
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            {uploading ? 'Envoi…' : 'Ajouter une photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void addPhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-cream-300 py-2 text-sm"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="flex-1 rounded-xl bg-tomato-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </fieldset>
  );
}
