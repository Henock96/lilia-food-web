import { AdminOnly } from '@/components/admin-only';

export default function IncidentsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
