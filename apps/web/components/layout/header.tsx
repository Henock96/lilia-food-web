'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useCart } from '@lilia/api-client';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@lilia/utils';

const navLinks = [
  { href: '/restaurants', label: 'Vendeurs' },
  { href: '/commandes', label: 'Mes commandes' },
  { href: '/favoris', label: 'Favoris' },
];

export function Header() {
  const pathname = usePathname();
  const { user, token, firebaseDisplayName, firebasePhotoUrl } = useAuthStore();
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <motion.header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-white/10 bg-[var(--noir-900)]/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5" aria-label="Lilia Food — Accueil">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/15 transition-transform group-hover:scale-105">
              <Image src="/logo.jpg" alt="" width={72} height={72} className="h-full w-full object-cover" />
            </span>
            <span
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Lilia<span className="text-ember"> Food</span>
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
                    'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'text-white' : 'text-white/60 hover:text-white',
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
              aria-label={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
              className="rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                {resolved === 'dark' ? (
                  <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun className="h-[1.15rem] w-[1.15rem]" />
                  </motion.span>
                ) : (
                  <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon className="h-[1.15rem] w-[1.15rem]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={toggleCart}
              className="relative rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ember-500)] text-xs font-bold text-white"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {token ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Mon profil"
              >
                {(user?.imageUrl ?? firebasePhotoUrl) ? (
                  <img
                    src={user?.imageUrl ?? firebasePhotoUrl!}
                    alt={user?.nom ?? firebaseDisplayName ?? ''}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--ember-400)]/40"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ember-500)]/20 ring-2 ring-[var(--ember-400)]/30">
                    <span className="text-xs font-bold text-[var(--ember-400)]">
                      {(user?.nom ?? firebaseDisplayName)?.[0]?.toUpperCase() ?? '·'}
                    </span>
                  </div>
                )}
                <span className="hidden sm:block">{user?.nom ?? firebaseDisplayName ?? 'Profil'}</span>
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="rounded-full bg-[var(--ember-500)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--ember-500)]/25 transition-colors hover:bg-[var(--ember-400)]"
              >
                Connexion
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
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
            className="overflow-hidden border-t border-white/10 bg-[var(--noir-900)]/95 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Menu mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
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
