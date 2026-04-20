'use client';

import {
  useDashboardOverview,
  useDashboardOrderStats,
  useRevenueChart,
  useTopProducts,
  usePeakHours,
  useClientStats,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { StatCard } from '@/components/dashboard/stat-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { OrderStats } from '@/components/dashboard/order-stats';
import { TopProducts } from '@/components/dashboard/top-products';
import { PeakHours } from '@/components/dashboard/peak-hours';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, TrendingUp, Users, Store } from 'lucide-react';

export default function DashboardPage() {
  const { token } = useAuthStore();

  const { data: overview, isLoading: loadingOverview } = useDashboardOverview(token);
  const { data: orderStats, isLoading: loadingStats } = useDashboardOrderStats(token);
  const { data: revenue, isLoading: loadingRevenue } = useRevenueChart(token);
  const { data: topProducts, isLoading: loadingTop } = useTopProducts(token);
  const { data: peakHours, isLoading: loadingPeak } = usePeakHours(token);
  const { data: clientStats } = useClientStats(token);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingOverview ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : overview ? (
          <>
            <StatCard
              label="Commandes aujourd'hui"
              value={overview.ordersToday}
              sub={`Total: ${overview.totalOrders}`}
              icon={ShoppingBag}
              color="orange"
            />
            <StatCard
              label="Revenus aujourd'hui"
              value={`${overview.revenueToday.toLocaleString('fr-FR')} FCFA`}
              sub={`Total: ${overview.totalRevenue.toLocaleString('fr-FR')} FCFA`}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Clients"
              value={overview.totalClients}
              sub={clientStats ? `${clientStats.newClientsThisMonth} ce mois` : undefined}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Restaurants"
              value={overview.totalRestaurants}
              icon={Store}
              color="purple"
            />
          </>
        ) : null}
      </div>

      {/* Revenue chart */}
      <div>
        {loadingRevenue ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : revenue ? (
          <RevenueChart data={revenue} />
        ) : null}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loadingStats ? (
          <>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </>
        ) : (
          <>
            {orderStats && <OrderStats data={orderStats} />}
            {loadingPeak ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : peakHours ? (
              <PeakHours data={peakHours} />
            ) : null}
          </>
        )}
      </div>

      {/* Top products */}
      <div>
        {loadingTop ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : topProducts ? (
          <TopProducts data={topProducts} />
        ) : null}
      </div>
    </div>
  );
}
