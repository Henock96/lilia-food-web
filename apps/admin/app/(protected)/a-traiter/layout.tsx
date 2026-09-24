import { AdminOnly } from '@/components/admin-only';

export default function ATraiterLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
