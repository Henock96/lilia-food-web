'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X } from 'lucide-react';

interface PreorderSlotPickerProps {
  open: boolean;
  /** Heures de préavis requises par le vendeur. Par défaut 24h. */
  leadHours: number;
  /** Valeur actuelle si déjà choisie, pour pré-remplir. */
  currentValue: Date | null;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}

export function PreorderSlotPicker({
  open,
  leadHours,
  currentValue,
  onSelect,
  onCancel,
}: PreorderSlotPickerProps) {
  // Bornes : min = now + leadHours, max = now + 7 jours
  const { minDateStr, maxDateStr } = useMemo(() => {
    const now = new Date();
    const min = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
    const max = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      minDateStr: toDateInputValue(min),
      maxDateStr: toDateInputValue(max),
    };
  }, [leadHours]);

  const [dateStr, setDateStr] = useState<string>(
    currentValue ? toDateInputValue(currentValue) : minDateStr,
  );
  const [timeStr, setTimeStr] = useState<string>(
    currentValue ? toTimeInputValue(currentValue) : '12:00',
  );
  const [error, setError] = useState<string | null>(null);

  // Resync picker state when modal opens with a new currentValue
  useEffect(() => {
    if (!open) return;
    setDateStr(currentValue ? toDateInputValue(currentValue) : minDateStr);
    setTimeStr(currentValue ? toTimeInputValue(currentValue) : '12:00');
    setError(null);
  }, [open, currentValue, minDateStr]);

  // ESC key handler to close modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const handleConfirm = () => {
    if (!dateStr || !timeStr) {
      setError('Veuillez choisir une date et une heure');
      return;
    }
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const [hh, mn] = timeStr.split(':').map(Number);
    const chosen = new Date(yyyy, mm - 1, dd, hh, mn, 0, 0);
    const minAllowed = new Date(Date.now() + leadHours * 60 * 60 * 1000);
    if (chosen < minAllowed) {
      setError(
        `Le créneau doit être au moins ${leadHours}h après maintenant (préavis vendeur)`,
      );
      return;
    }
    const maxAllowed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (chosen > maxAllowed) {
      setError('Le créneau ne peut pas être à plus de 7 jours');
      return;
    }
    setError(null);
    onSelect(chosen);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-picker-title"
        >
          <motion.div
            className="bg-white dark:bg-dark-card rounded-2xl max-w-md w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 id="slot-picker-title" className="font-bold text-lg text-gray-900 dark:text-zinc-100">
                  Date et heure de retrait
                </h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Le vendeur a besoin de minimum <strong>{leadHours}h</strong> de préavis.
                </p>
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 p-1"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  Date
                </label>
                <input
                  type="date"
                  value={dateStr}
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => { setDateStr(e.target.value); setError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:bg-dark-surface dark:border-dark-border dark:text-zinc-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  <Clock className="w-4 h-4" />
                  Heure
                </label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => { setTimeStr(e.target.value); setError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:bg-dark-surface dark:border-dark-border dark:text-zinc-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 outline-none"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-zinc-300 font-medium hover:bg-gray-50 dark:hover:bg-dark-surface"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700"
              >
                Valider le créneau
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helpers : formatage local pour les inputs HTML (YYYY-MM-DD / HH:mm).
function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mn}`;
}
