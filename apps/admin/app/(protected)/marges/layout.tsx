import { AdminOnly } from '@/components/admin-only';

// Garde de route, comme les autres sections `adminOnly` : la marge de chaque
// commande ne regarde que l'administration, jamais un vendeur.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
