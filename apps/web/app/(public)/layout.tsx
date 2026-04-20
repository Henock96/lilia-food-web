import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/layout/cart-drawer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <Header />
      </Suspense>
      <CartDrawer />
      <main className="min-h-screen">{children}</main>
      <Suspense>
        <Footer />
      </Suspense>
    </>
  );
}
