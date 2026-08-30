import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@/components/analytics';
import { Providers } from '@/components/providers';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { SITE_URL } from '@/lib/site';
import './globals.css';

/**
 * Polices auto-hébergées par Next au moment du build : le navigateur les
 * télécharge depuis notre domaine, en parallèle du CSS et non à sa suite.
 * `display: 'swap'` affiche immédiatement le texte dans la police système en
 * attendant — mieux vaut un texte lisible tout de suite qu'un blanc.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

// `alternates.canonical` n'est VOLONTAIREMENT pas défini ici : une valeur
// posée sur le layout racine est héritée par toutes les routes descendantes
// qui ne la surchargent pas. Avec `canonical: '/'`, chaque page déclarait la
// home comme sa version de référence — Google n'indexait donc que la home.
// Chaque page publique définit désormais son propre canonical.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    description: 'Commandez depuis les meilleurs restaurants de Brazzaville au Congo. Livraison rapide, paiement MTN MoMo.',
    url: SITE_URL,
    siteName: 'Lilia Food',
    locale: 'fr_CG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lilia Food',
    description: 'Livraison de repas à Brazzaville au Congo',
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
    <html
      lang="fr"
      className={`${inter.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Suspense>
          <Providers>
            {children}
            <ScrollToTop />
            <Analytics />
            <Toaster
              position="top-center"
              richColors
              toastOptions={{
                style: { fontFamily: 'var(--font-sans)' },
              }}
            />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
