import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/layout/cart-drawer';
import { SkipLink } from '@/components/ui/skip-link';

// Espace personnel : panier, commandes, favoris, profil. Rien à indexer, et
// `robots.txt` seul ne suffit pas — une page peut être indexée sans être
// crawlée si elle est liée depuis ailleurs. Le `noindex` ferme le cas.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      <CartDrawer />
      <main id="contenu" className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
