import { AdminOnly } from '@/components/admin-only';

// Lot C (15/11/2026, D2) — le vendeur ne connaît pas ses clients.
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
