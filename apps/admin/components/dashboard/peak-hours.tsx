'use client';

import type { PeakHourData } from '@lilia/types';

interface PeakHoursProps {
  data: PeakHourData[];
}

export function PeakHours({ data }: PeakHoursProps) {
  const max = Math.max(...data.map((d) => d.orders), 1);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-5 shadow-card">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Heures de pointe</h3>
      <div className="flex items-end gap-1 h-20">
        {Array.from({ length: 24 }, (_, h) => {
          const entry = data.find((d) => d.hour === h);
          const count = entry?.orders ?? 0;
          const pct = (count / max) * 100;
          const isPeak = pct >= 70;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className={`w-full rounded-sm transition-all ${isPeak ? 'bg-primary-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              {/* Tooltip on hover */}
              {count > 0 && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-zinc-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {h}h: {count} cmd
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h} className="text-xs text-zinc-400">{h}h</span>
        ))}
      </div>
    </div>
  );
}
