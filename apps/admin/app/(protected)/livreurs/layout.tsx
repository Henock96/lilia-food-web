import { AdminOnly } from '@/components/admin-only';

export default function LivreursLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
