import { AdminOnly } from '@/components/admin-only';

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
