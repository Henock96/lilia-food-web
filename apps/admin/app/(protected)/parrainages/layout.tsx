import { AdminOnly } from '@/components/admin-only';

// Garde de route, comme les autres sections `adminOnly` de la sidebar. La page
// portait déjà un refus en ligne (`useIsAdmin`), mais ses requêtes partaient
// avant — un RESTAURATEUR qui tapait l'URL collectionnait des 403.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
