import { AdminOnly } from '@/components/admin-only';

export default function ReviewsModerationLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
