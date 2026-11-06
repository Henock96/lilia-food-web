'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  // Sous `lg`, le panier a sa barre « Commander » au même endroit.
  const display = usePathname() === '/panier' ? 'hidden lg:flex' : 'flex';
  // À gauche sous `lg` : à droite, il recouvrait le « + » des cartes produit.
  const side = 'left-6 lg:left-auto lg:right-6';

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Retour en haut"
          className={`fixed bottom-6 ${side} z-40 w-11 h-11 bg-tomato-600 hover:bg-tomato-700 text-white rounded-2xl shadow-lg shadow-tomato-600/30 ${display} items-center justify-center transition-colors active:scale-95`}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
