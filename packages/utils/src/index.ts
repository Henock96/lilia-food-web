import type { OrderStatus, DayOfWeek } from '@lilia/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(date);
}

export function formatOrderStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    EN_ATTENTE: 'En attente',
    PAYER: 'Payé',
    EN_PREPARATION: 'En préparation',
    PRET: 'Prêt',
    EN_ROUTE: 'En route',
    LIVRER: 'Livré',
    ANNULER: 'Annulé',
  };
  return labels[status] ?? status;
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    EN_ATTENTE: 'text-amber-600 bg-amber-50 border-amber-200',
    PAYER: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    EN_PREPARATION: 'text-blue-600 bg-blue-50 border-blue-200',
    PRET: 'text-purple-600 bg-purple-50 border-purple-200',
    EN_ROUTE: 'text-orange-600 bg-orange-50 border-orange-200',
    LIVRER: 'text-emerald-700 bg-emerald-100 border-emerald-300',
    ANNULER: 'text-rose-600 bg-rose-50 border-rose-200',
  };
  return colors[status] ?? 'text-zinc-600 bg-zinc-100 border-zinc-200';
}

export function formatDeliveryTime(min: number, max: number): string {
  return `${min}-${max} min`;
}

export function formatDayOfWeek(day: DayOfWeek): string {
  const labels: Record<DayOfWeek, string> = {
    LUNDI: 'Lundi',
    MARDI: 'Mardi',
    MERCREDI: 'Mercredi',
    JEUDI: 'Jeudi',
    VENDREDI: 'Vendredi',
    SAMEDI: 'Samedi',
    DIMANCHE: 'Dimanche',
  };
  return labels[day] ?? day;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Très bien';
  if (rating >= 3.0) return 'Bien';
  if (rating >= 2.0) return 'Moyen';
  return 'Mauvais';
}

export function calculateCartTotal(items: Array<{ prix: number; quantite: number }>): number {
  return items.reduce((sum, item) => sum + item.prix * item.quantite, 0);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
