import { AdminOnly } from '@/components/admin-only';

export default function VendorOffersLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
