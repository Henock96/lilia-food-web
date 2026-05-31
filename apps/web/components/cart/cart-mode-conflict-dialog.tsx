'use client';

import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartModeConflictDialogProps {
  open: boolean;
  /** Le panier existant est preorder (true) ou standard (false). */
  cartIsPreorder: boolean;
  /** Nom du produit que l'utilisateur essaie d'ajouter — pour le message. */
  incomingProductName: string;
  /** Confirme : vide le panier puis ajoute le nouvel item. */
  onConfirm: () => void;
  /** Annule l'ajout, garde le panier intact. */
  onCancel: () => void;
}

export function CartModeConflictDialog({
  open,
  cartIsPreorder,
  incomingProductName,
  onConfirm,
  onCancel,
}: CartModeConflictDialogProps) {
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
          aria-labelledby="cart-conflict-title"
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-orange-100 p-2 shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 id="cart-conflict-title" className="font-bold text-lg text-gray-900">
                  Mode de commande incompatible
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {cartIsPreorder
                    ? `Votre panier contient des produits sur commande. "${incomingProductName}" est un produit standard.`
                    : `Votre panier contient des produits standard. "${incomingProductName}" est un produit sur commande (date à programmer).`}
                  {' '}Un panier ne peut pas mélanger les deux modes.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700"
              >
                Vider et ajouter
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
