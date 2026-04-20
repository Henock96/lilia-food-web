'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/restaurants', label: 'Restaurants', icon: Store },
  { href: '/clients', label: 'Clients', icon: Users },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut: clearStore, user } = useAuthStore();

  async function handleSignOut() {
    try {
      await signOut(auth);
      clearStore();
      document.cookie = 'firebase-token=; path=/; max-age=0';
      router.replace('/connexion');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-zinc-950 dark:bg-zinc-950
          border-r border-zinc-800
          transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Lilia Food</p>
              <p className="text-zinc-500 text-xs leading-tight">Admin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-400 text-xs font-semibold">
                    {user.nom?.charAt(0)?.toUpperCase() ?? 'A'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-zinc-200 text-xs font-medium truncate">{user.nom ?? 'Admin'}</p>
                <p className="text-zinc-500 text-xs truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }
                `}
              >
                <Icon size={16} className={active ? 'text-primary-400' : ''} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-zinc-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
