import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/layout/cart-drawer';
import { SkipLink } from '@/components/ui/skip-link';

/**
 * Le `Header` et le `Footer` étaient chacun enveloppés dans un `<Suspense>`
 * sans fallback. Ni l'un ni l'autre ne suspend — le header lit `usePathname`,
 * le footer est un Server Component — mais ces frontières faisaient streamer
 * leur contenu hors séquence : dans le HTML servi, les titres du footer
 * apparaissaient AVANT le `<h1>` de la page. Ordre de lecture incohérent pour
 * les lecteurs d'écran, et hiérarchie de titres illisible pour les robots.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
