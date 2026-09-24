import { AdminOnly } from '@/components/admin-only';

export default function TarifsLivraisonLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
