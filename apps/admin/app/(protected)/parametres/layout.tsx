import { AdminOnly } from '@/components/admin-only';

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
