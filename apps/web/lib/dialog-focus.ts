'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Où envoyer le focus sur `Tab` dans un dialogue. `null` : le navigateur fait
 * le bon geste tout seul, on ne s'interpose qu'aux extrémités.
 */
export function nextFocusIndex(count: number, current: number, shiftKey: boolean): number | null {
  if (count === 0) return null;
  if (current === -1) return shiftKey ? count - 1 : 0;
  if (shiftKey && current === 0) return count - 1;
  if (!shiftKey && current === count - 1) return 0;
  return null;
}

/**
 * Comportement clavier d'un dialogue modal : `aria-modal` ne fait que l'annoncer.
 * Le focus entre dans le dialogue à l'ouverture (`data-autofocus` s'il y en a
 * un, sinon le premier élément), `Tab` y reste, `Escape` le ferme, et le focus
 * revient à l'élément d'origine — sans quoi le clavier repart du haut de la page.
 *
 * `onClose` passe par une référence : les appelants donnent une fonction neuve
 * à chaque rendu, et rejouer l'effet ramènerait le focus au début à chaque frappe.
 */
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    const initial =
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0];
    initial?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const target = nextFocusIndex(
        elements.length,
        elements.indexOf(document.activeElement as HTMLElement),
        event.shiftKey,
      );
      if (target === null) return;
      event.preventDefault();
      elements[target].focus();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  return dialogRef;
}
