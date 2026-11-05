'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogFocus } from '@/lib/dialog-focus';

/**
 * Confirmation d'un geste qui ne se rattrape pas. `window.confirm` bloquait la
 * page, ne suivait pas la charte et disait « OK » à la place du geste.
 *
 * Le focus va à `cancelLabel` : un Entrée machinal ne doit rien détruire.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(open, onCancel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="font-bold text-lg text-ink-900">
              {title}
            </h2>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-autofocus
                disabled={pending}
                onClick={onCancel}
                className="min-h-11 px-4 text-sm font-medium text-ink-700 border border-cream-300 rounded-xl hover:bg-cream-100 transition-colors disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className="min-h-11 px-4 text-sm font-semibold text-white bg-danger rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
