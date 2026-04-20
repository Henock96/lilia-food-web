'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, ChefHat, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useCart } from '@lilia/api-client';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@lilia/utils';

const navLinks = [
  { href: '/restaurants', label: 'Restaurants' },
  { href: '/commandes', label: 'Mes commandes' },
];

export function Header() {
  const pathname = usePathname();
  const { user, token } = useAuthStore();
  const { itemCount, setItemCount, toggleCart } = useCartStore();
  const { resolved, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: cart } = useCart(token);

  useEffect(() => {
    if (cart) {
      const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantite, 0);
      setItemCount(count);
    }
  }, [cart, setItemCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-dark-border/80 shadow-sm'
          : 'bg-transparent',
      )}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Lilia Food — Accueil">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
              Lilia Food
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-full transition-colors',
                  pathname.startsWith(link.href)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-card',
                )}
              >
                {link.label}
                {pathname.startsWith(link.href) && (
                  <motion.div layoutId="nav-indicator" className="absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-full -z-10" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
              aria-label={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
              className="p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-card rounded-full transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {resolved === 'dark' ? (
                  <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun className="w-4.5 h-4.5" />
                  </motion.span>
                ) : (
                  <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon className="w-4.5 h-4.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Panier */}
            <button
              onClick={toggleCart}
              className="relative p-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-card rounded-full transition-colors"
              aria-label={`Panier${itemCount > 0 ? ` (${itemCount} article${itemCount > 1 ? 's' : ''})` : ''}`}
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Profil / Connexion */}
            {user ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-card rounded-full transition-colors"
                aria-label="Mon profil"
              >
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt={user.nom ?? ''} className="w-7 h-7 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-700" />
                ) : (
                  <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center ring-2 ring-primary-200 dark:ring-primary-700">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {user.nom?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  </div>
                )}
                <span className="hidden sm:block">{user.nom ?? 'Profil'}</span>
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
              >
                Connexion
              </Link>
            )}

            {/* Menu mobile */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-card rounded-full transition-colors"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden bg-white dark:bg-dark-surface border-t border-zinc-200 dark:border-dark-border"
          >
            <nav className="px-4 py-3 flex flex-col gap-1" aria-label="Menu mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-xl transition-colors',
                    pathname.startsWith(link.href)
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-card',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
