'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useRestaurantOrders } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import type { Order } from '@lilia/types';

const LATE_MINUTES = 30;

export function LateOrdersAlert() {
  const { token } = useAuthStore();
  const { data: orders } = useRestaurantOrders(token);
  const [dismissed, setDismissed] = useState(false);

  const now = Date.now();
  const lateOrders = (orders ?? []).filter((o: Order) => {
    if (!['EN_ATTENTE', 'EN_PREPARATION'].includes(o.status)) return false;
    return now - new Date(o.createdAt).getTime() > LATE_MINUTES * 60 * 1000;
  });

  if (dismissed || lateOrders.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
      <AlertTriangle size={16} className="text-red-500 shrink-0" />
      <p className="flex-1 text-sm text-red-700 dark:text-red-400">
        <span className="font-semibold">{lateOrders.length} commande{lateOrders.length > 1 ? 's' : ''}</span>
        {' '}en attente depuis plus de {LATE_MINUTES} min — vérifiez les restaurants
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
