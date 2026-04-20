import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Lilia Admin',
    template: '%s | Lilia Admin',
  },
  description: 'Tableau de bord administrateur Lilia Food',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Suspense>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              richColors
              toastOptions={{
                style: { fontFamily: 'var(--font-sans)' },
                classNames: {
                  toast: 'dark:!bg-zinc-800 dark:!border-zinc-700 dark:!text-zinc-100',
                },
              }}
            />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
