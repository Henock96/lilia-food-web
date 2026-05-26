'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { ShieldOff } from 'lucide-react';

/**
 * Garde route admin-only (LIL-102) — pendant du `_AdminOnlyGuard` Flutter
 * dans `lilia-food-admin/lib/routing/app_router.dart`.
 *
 * Tant que `user` est en cours de chargement (rehydratation Zustand ou
 * sync backend), on affiche un loader pour éviter les flashs vers
 * "Accès refusé" pendant le boot.
 *
 * Une fois résolu :
 *   - role === 'ADMIN' → render `children`
 *   - sinon → redirige vers `/dashboard` + écran 403 transitoire
 *
 * Usage :
 *   ```tsx
 *   export default function Page() {
 *     return <AdminOnly><RealContent /></AdminOnly>;
 *   }
 *   ```
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    // Quand le sync est terminé ET que ce n'est pas un admin → redirect.
    // (On évite de rediriger tant que `user` est encore null pour ne pas
    // expulser pendant la rehydratation localStorage.)
    if (!isLoading && user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, isAdmin, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    // Affiché brièvement avant que le useEffect ne déclenche le redirect.
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <ShieldOff size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Accès réservé aux administrateurs
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cette section n'est pas accessible avec votre rôle. Redirection en cours…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
