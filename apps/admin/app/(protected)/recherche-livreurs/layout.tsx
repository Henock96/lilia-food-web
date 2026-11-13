import { AdminOnly } from '@/components/admin-only';

export default function RechercheLivreursLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminOnly>{children}</AdminOnly>;
}
