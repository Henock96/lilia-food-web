import { AdminOnly } from '@/components/admin-only';

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
