import { AdminOnly } from '@/components/admin-only';

export default function PromosLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
