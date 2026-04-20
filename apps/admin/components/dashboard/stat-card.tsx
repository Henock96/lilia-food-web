import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'orange' | 'green' | 'blue' | 'purple';
}

const colorMap = {
  orange: 'bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
  green:  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  blue:   'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  purple: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
};

export function StatCard({ label, value, sub, icon: Icon, trend, color = 'orange' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend >= 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
