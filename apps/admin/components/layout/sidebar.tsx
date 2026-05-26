'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { useDashboardOverview } from '@lilia/api-client';
import { useIsAdmin, useIsRestaurateur } from '@/lib/use-role';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  LogOut,
  X,
  Package,
  Tag,
  CreditCard,
  Bike,
  MapPin,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Mapping nav items role-aware (LIL-102).
 *
 * - `adminOnly`: visible uniquement par ADMIN
 * - `restaurateurLabel`: si défini, remplace le `label` quand l'utilisateur
 *   est RESTAURATEUR (ex: "Restaurants" → "Mon Restaurant")
 *
 * RESTAURATEUR voit : Dashboard, Commandes, Produits, Mon Restaurant,
 * Clients (de son resto), Promos. Les sections globales (Paiements,
 * Incidents, Livreurs, Zones, Paramètres plateforme) sont admin-only.
 */
const NAV_ITEMS: {
  href: string;
  label: string;
  restaurateurLabel?: string;
  icon: typeof LayoutDashboard;
  badge: boolean;
  adminOnly: boolean;
}[] = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, badge: false, adminOnly: false },
  { href: '/commandes',   label: 'Commandes',   icon: ShoppingBag,     badge: true,  adminOnly: false },
  { href: '/produits',    label: 'Produits',    icon: Package,         badge: false, adminOnly: false },
  { href: '/restaurants', label: 'Restaurants', restaurateurLabel: 'Mon Restaurant', icon: Store, badge: false, adminOnly: false },
  // Clients : endpoint /admin/clients réservé ADMIN. La vue scoped resto
  // (GET /restaurants/:id/clients) viendra dans un follow-up de LIL-102.
  { href: '/clients',     label: 'Clients',     icon: Users,           badge: false, adminOnly: true  },
  // Promos : endpoints /promo CRUD sont @Roles('ADMIN') côté backend.
  { href: '/promos',      label: 'Promos',      icon: Tag,             badge: false, adminOnly: true  },
  { href: '/paiements',   label: 'Paiements',   icon: CreditCard,      badge: false, adminOnly: true  },
  { href: '/incidents',   label: 'Incidents',   icon: AlertTriangle,   badge: false, adminOnly: true  },
  { href: '/livreurs',    label: 'Livreurs',    icon: Bike,            badge: false, adminOnly: true  },
  { href: '/zones',       label: 'Zones',       icon: MapPin,          badge: false, adminOnly: true  },
  { href: '/parametres',  label: 'Paramètres',  icon: Settings,        badge: false, adminOnly: true  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface OverviewData { orders: { pending: number } }

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut: clearStore, user, token } = useAuthStore();
  const { data: rawOverview } = useDashboardOverview(token);
  const pending = (rawOverview as unknown as OverviewData | undefined)?.orders?.pending ?? 0;
  const isAdmin = useIsAdmin();
  const isRestaurateur = useIsRestaurateur();

  // Filtre les items globaux pour les RESTAURATEUR + ajuste les labels.
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin,
  ).map((item) => ({
    ...item,
    label: isRestaurateur && item.restaurateurLabel ? item.restaurateurLabel : item.label,
  }));

  async function handleSignOut() {
    try {
      await signOut(getFirebaseAuth());
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
          {visibleNavItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const showBadge = badge && pending > 0;
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
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {pending > 99 ? '99+' : pending}
                  </span>
                )}
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
