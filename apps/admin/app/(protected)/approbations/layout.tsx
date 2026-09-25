import { AdminOnly } from '@/components/admin-only';

export default function ApprobationsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
