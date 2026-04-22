'use client';

import { useState } from 'react';
import {
  useDashboardOverview,
  useDashboardOrderStats,
  useRevenueChart,
  usePeakHours,
  useClientStats,
} from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { StatCard } from '@/components/dashboard/stat-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { OrderStats } from '@/components/dashboard/order-stats';
import { PeakHours } from '@/components/dashboard/peak-hours';
import { RestaurantRevenue } from '@/components/dashboard/restaurant-revenue';
import { RestaurantStatus } from '@/components/dashboard/restaurant-status';
import { LateOrdersAlert } from '@/components/dashboard/late-orders-alert';
import { LiveOrderFeed } from '@/components/dashboard/live-order-feed';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, TrendingUp, Users, Store, Star } from 'lucide-react';

interface OverviewData {
  orders:   { total: number; today: number; week: number; month: number; pending: number };
  revenue:  { total: number; today: number; week: number; month: number; currency: string };
  products: { total: number };
  clients:  { total: number; week: number; month: number };
  rating:   { average: number; count: number };
  totalRestaurants: number;
}

interface ClientsData {
  thisMonth: { total: number; new: number; returning: number };
}

type Period = 'today' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
  today: "Aujourd'hui",
  week:  'Cette semaine',
  month: 'Ce mois',
};

export default function DashboardPage() {
  const { token } = useAuthStore();
  const [period, setPeriod] = useState<Period>('today');

  const { data: rawOverview,  isLoading: loadingOverview } = useDashboardOverview(token);
  const { data: orderStats,   isLoading: loadingStats }    = useDashboardOrderStats(token);
  const { data: revenue,      isLoading: loadingRevenue }  = useRevenueChart(token);
  const { data: peakHours,    isLoading: loadingPeak }     = usePeakHours(token);
  const { data: rawClients }                               = useClientStats(token);

  const ov      = rawOverview as unknown as OverviewData | undefined;
  const clients = rawClients  as unknown as ClientsData  | undefined;

  const ordersValue  = ov ? (period === 'today' ? ov.orders.today  : period === 'week' ? ov.orders.week  : ov.orders.month)  : 0;
  const revenueValue = ov ? (period === 'today' ? ov.revenue.today : period === 'week' ? ov.revenue.week : ov.revenue.month) : 0;
  const clientsValue = ov ? (period === 'today' ? ov.clients.total : period === 'week' ? ov.clients.week : ov.clients.month) : 0;

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Late orders alert */}
      <LateOrdersAlert />

      {/* Period toggle */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p
                ? 'bg-white dark:bg-dark-card text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Stat cards — 6 cartes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loadingOverview ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : ov ? (
          <>
            <StatCard
              label={`Commandes ${periodLabels[period].toLowerCase()}`}
              value={ordersValue}
              sub={`Total: ${ov.orders.total}`}
              icon={ShoppingBag}
              color="orange"
            />
            <StatCard
              label="En attente"
              value={ov.orders.pending}
              sub={`Ce mois: ${ov.orders.month}`}
              icon={ShoppingBag}
              color="orange"
            />
            <StatCard
              label={`Revenus ${periodLabels[period].toLowerCase()}`}
              value={`${revenueValue.toLocaleString('fr-FR')} FCFA`}
              sub={`Total: ${ov.revenue.total.toLocaleString('fr-FR')} FCFA`}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label={`Clients ${periodLabels[period].toLowerCase()}`}
              value={clientsValue}
              sub={clients ? `${clients.thisMonth.new} nouveaux ce mois` : undefined}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Restaurants"
              value={ov.totalRestaurants}
              icon={Store}
              color="purple"
            />
            <StatCard
              label="Note moyenne"
              value={ov.rating.average.toFixed(1)}
              sub={`${ov.rating.count} avis`}
              icon={Star}
              color="orange"
            />
          </>
        ) : null}
      </div>

      {/* Revenue chart */}
      {loadingRevenue ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : revenue && (Array.isArray(revenue) ? revenue.length > 0 : true) ? (
        <RevenueChart data={Array.isArray(revenue) ? revenue : []} />
      ) : null}

      {/* Revenus par restaurant + Restaurant status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RestaurantRevenue />
        <RestaurantStatus />
      </div>

      {/* Live order feed */}
      <LiveOrderFeed />

      {/* Order stats + Peak hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loadingStats ? (
          <>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </>
        ) : (
          <>
            {Array.isArray(orderStats) && orderStats.length > 0 && (
              <OrderStats data={orderStats} />
            )}
            {loadingPeak ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : peakHours ? (
              <PeakHours data={peakHours} />
            ) : null}
          </>
        )}
      </div>

    </div>
  );
}
