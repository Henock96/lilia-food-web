'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/connexion');
      return;
    }
    const allowed: string[] = ['ADMIN', 'RESTAURATEUR'];
    if (!allowed.includes(user.role)) {
      router.replace('/connexion');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold">L</span>
          </div>
          <p className="text-sm text-zinc-400">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user || !['ADMIN', 'RESTAURATEUR'].includes(user.role)) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-dark-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
