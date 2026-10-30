import { AdminOnly } from '@/components/admin-only';

// Garde de route, comme les autres sections `adminOnly` de la sidebar : la
// joignabilité couvre toutes les boutiques, elle est réservée à l'admin.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
