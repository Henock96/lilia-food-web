import { AdminOnly } from '@/components/admin-only';

export default function ZonesLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
