'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useCart } from '@lilia/api-client';
import { cn } from '@lilia/utils';

const navLinks = [
  { href: '/restaurants', label: 'Vendeurs' },
  { href: '/commandes', label: 'Mes commandes' },
  { href: '/favoris', label: 'Favoris' },
  { href: '/devenir-vendeur', label: 'Devenir vendeur' },
];

export function Header() {
  const pathname = usePathname();
  const { user, token, firebaseDisplayName, firebasePhotoUrl } = useAuthStore();
  const { itemCount, setItemCount, toggleCart } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ferme le menu mobile à chaque changement de route (reset pendant le render).
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }

  const { data: cart } = useCart(token);

  useEffect(() => {
    if (cart) {
      const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantite, 0);
      setItemCount(count);
    }
  }, [cart, setItemCount]);

  return (
    // L'en-tête glissait depuis `y: -80` à chaque montage, donc à chaque
    // navigation : une demi-seconde pendant laquelle le haut de la page est
    // vide, sur un élément qui doit au contraire être immédiatement stable.
    // C'est de la décoration payée en confort perçu — supprimée.
    <header className="sticky top-0 z-50 border-b border-cream-300 bg-cream-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5" aria-label="Lilia Food — Accueil">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl transition-transform group-hover:scale-105">
              <Image src="/logo.jpg" alt="" width={72} height={72} className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">
              Lilia<span className="text-tomato-600"> Food</span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-colors',
                    active ? 'font-semibold text-ink-900' : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleCart}
              className="relative rounded-full p-2.5 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900"
              aria-label={`Panier${itemCount > 0 ? ` (${itemCount} article${itemCount > 1 ? 's' : ''})` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-tomato-600 text-xs font-bold text-white"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {token ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900"
                aria-label="Mon profil"
              >
                {(user?.imageUrl ?? firebasePhotoUrl) ? (
                  <Image
                    src={user?.imageUrl ?? firebasePhotoUrl!}
                    alt={user?.nom ?? firebaseDisplayName ?? ''}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-tomato-100">
                    <span className="text-xs font-bold text-tomato-700">
                      {(user?.nom ?? firebaseDisplayName)?.[0]?.toUpperCase() ?? '·'}
                    </span>
                  </div>
                )}
                <span className="hidden sm:block">{user?.nom ?? firebaseDisplayName ?? 'Profil'}</span>
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 tracking-[-0.01em] whitespace-nowrap select-none bg-tomato-600 text-white hover:bg-tomato-700 shadow-sm hover:shadow-md px-5 py-2.5 text-sm rounded-pill"
              >
                Connexion
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-full p-2 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900 md:hidden"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-cream-300 bg-cream-100 shadow-md md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Menu mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-cream-200 font-semibold text-ink-900'
                      : 'text-ink-500 hover:bg-cream-200 hover:text-ink-900',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {/* Le menu mobile n'offrait aucun accès au support : sur un site
                  dont l'audience est très majoritairement mobile, l'aide était
                  atteignable uniquement en faisant défiler jusqu'au footer. */}
              <Link
                href="/support"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-900"
              >
                Support
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
