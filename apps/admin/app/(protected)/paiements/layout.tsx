import { AdminOnly } from '@/components/admin-only';

export default function PaiementsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
