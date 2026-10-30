import { AdminOnly } from '@/components/admin-only';

// Garde de route, comme les autres sections `adminOnly` : le rapprochement
// touche à l'argent de toute la plateforme, il est réservé à l'admin.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
