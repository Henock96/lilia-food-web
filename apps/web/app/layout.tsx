import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Lilia Food — Livraison de repas à Brazzaville',
    template: '%s | Lilia Food',
  },
  description:
    'Commandez vos repas préférés en ligne. Livraison rapide à Brazzaville depuis les meilleurs restaurants. Paiement MTN MoMo.',
  keywords: ['livraison repas', 'Brazzaville', 'food delivery', 'restaurant', 'commander en ligne', 'MTN MoMo', 'Congo'],
  authors: [{ name: 'Lilia Food' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'Lilia Food — Livraison de repas à Brazzaville',
    description: 'Commandez depuis les meilleurs restaurants de Brazzaville. Livraison rapide, paiement MTN MoMo.',
    siteName: 'Lilia Food',
    locale: 'fr_CG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lilia Food',
    description: 'Livraison de repas à Brazzaville',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lilia Food',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f0d0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <ScrollToTop />
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: { fontFamily: 'var(--font-sans)' },
              classNames: {
                toast: 'dark:!bg-dark-card dark:!border-dark-border dark:!text-zinc-100',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
