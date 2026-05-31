'use client';

import { useState, useEffect } from 'react';
import { Star, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCanReview,
  useMyReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';

interface LeaveReviewFormProps {
  restaurantId: string;
}

const MAX_COMMENT = 1000;

export function LeaveReviewForm({ restaurantId }: LeaveReviewFormProps) {
  const { token } = useAuthStore();
  const canReviewQ = useCanReview(restaurantId, token);
  const myReviewQ = useMyReview(restaurantId, token);
  const createMut = useCreateReview(token);
  const updateMut = useUpdateReview(token, restaurantId);
  const deleteMut = useDeleteReview(token, restaurantId);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const canReview = canReviewQ.data?.canReview ?? false;
  const reason = canReviewQ.data?.reason ?? null;
  const existingReviewId = canReviewQ.data?.existingReviewId ?? null;
  const isEditing = !canReview && !!existingReviewId;
  const isDisabledByGate = !canReview && !existingReviewId;
  const existingReview = isEditing ? myReviewQ.data ?? null : null;

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment ?? '');
    }
  }, [existingReview]);

  if (!token) return null;
  if (canReviewQ.isLoading) {
    return (
      <div className="skeleton h-32 rounded-2xl mb-5" aria-hidden="true" />
    );
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error('Veuillez choisir au moins une étoile');
      return;
    }
    try {
      if (isEditing && existingReviewId) {
        await updateMut.mutateAsync({
          id: existingReviewId,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Avis mis à jour');
      } else {
        await createMut.mutateAsync({
          restaurantId,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Merci pour votre avis !');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string; status?: number }).message;
      const status = (err as { status?: number }).status;
      if (status === 429) {
        toast.error('Vous publiez trop d\'avis, veuillez patienter');
      } else {
        toast.error(msg || 'Erreur lors de la publication');
      }
    }
  }

  async function handleDelete() {
    if (!existingReviewId) return;
    const ok = window.confirm('Supprimer définitivement votre avis ?');
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(existingReviewId);
      setRating(0);
      setComment('');
      toast.success('Avis supprimé');
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message;
      toast.error(msg || 'Suppression impossible');
    }
  }

  if (isDisabledByGate) {
    return (
      <div className="bg-zinc-50 dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl p-4 mb-5 flex items-start gap-3">
        <div className="rounded-full bg-zinc-200 dark:bg-zinc-700 p-2 shrink-0">
          <Lock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Laisser un avis
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {reason ?? 'Vous devez avoir commandé dans ce restaurant pour laisser un avis.'}
          </p>
        </div>
      </div>
    );
  }

  const submitting = createMut.isPending || updateMut.isPending;
  const deleting = deleteMut.isPending;

  return (
    <div className="bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isEditing ? 'Votre avis' : 'Laisser un avis'}
        </h4>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= (hoverRating || rating);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === rating}
              aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
              className="p-0.5"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  filled
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-zinc-300 dark:text-zinc-600 fill-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
        placeholder="Partagez votre expérience (optionnel)"
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 outline-none resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-zinc-400">
          {comment.length}/{MAX_COMMENT}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || rating < 1}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Envoi…' : isEditing ? 'Mettre à jour' : 'Publier'}
        </button>
      </div>
    </div>
  );
}
