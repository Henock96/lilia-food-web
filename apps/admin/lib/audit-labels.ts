import type { AdminAuditAction } from '@lilia/types';

/**
 * Libellés du journal d'audit. `Record` exhaustif : une action ajoutée à
 * `ADMIN_AUDIT_ACTIONS` sans libellé casse le type-check, au lieu de
 * s'afficher en code brut (c'est ce qui arrivait à `PLATFORM_SETTINGS_CHANGED`
 * dans l'Admin Flutter).
 */
export const AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
  PAYOUT_REQUESTED: 'Reversement déclenché',
  PAYOUT_RETRIED: 'Reversement relancé',
  PAYOUT_CANCELLED: 'Reversement annulé',
  VENDOR_PAYOUT_ACCOUNT_UPDATED: 'Compte de reversement modifié',
  USER_ROLE_CHANGED: 'Rôle modifié',
  USER_BANNED: 'Compte banni',
  USER_UNBANNED: 'Bannissement levé',
  DRIVER_CREATED: 'Livreur créé',
  DRIVER_UPDATED: 'Livreur modifié',
  DRIVER_ACTIVATED: 'Livreur activé',
  DRIVER_DEACTIVATED: 'Livreur désactivé',
  DRIVER_SETTLEMENT_RECORDED: 'Règlement livreur enregistré',
  DRIVER_SETTLEMENT_CANCELLED: 'Règlement livreur annulé',
  VENDOR_DISPLAY_ORDER_CHANGED: "Ordre d'affichage modifié",
  VENDOR_FEATURED_TOGGLED: 'Mise en avant modifiée',
  VENDOR_CREATED: 'Vendeur créé',
  VENDOR_ACTIVATED: 'Vendeur activé',
  VENDOR_COMMISSION_CHANGED: 'Commission vendeur modifiée',
  VENDOR_CATALOG_EDITED: 'Catalogue vendeur modifié par un admin',
  VENDOR_APPROVED: 'Vendeur approuvé',
  VENDOR_SUSPENDED: 'Vendeur suspendu',
  VENDOR_ACTIVE_TOGGLED: 'Vendeur activé / désactivé',
  PAYMENT_CONFIRMED: 'Paiement confirmé',
  PAYMENT_REJECTED: 'Paiement rejeté',
  REFUND_CREATED: 'Remboursement ouvert',
  REFUND_UPDATED: 'Remboursement mis à jour',
  ORDER_STATUS_FORCED: 'Statut de commande forcé',
  LOYALTY_ADJUSTED: 'Points de fidélité ajustés',
  PLATFORM_SETTINGS_CHANGED: 'Configuration plateforme modifiée',
  REFERRAL_REWARD_REVIEWED: 'Récompense de parrainage arbitrée',
};

/** Toutes les actions, dans l'ordre des libellés — pour le filtre du journal. */
export const ADMIN_AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AdminAuditAction[];

export function auditActionLabel(action: string): string {
  return (AUDIT_ACTION_LABELS as Record<string, string>)[action] ?? action;
}

/** `{ champ: { before, after } }` → lignes lisibles ; `[]` si autre forme. */
export function settingsDiffLines(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const lines: string[] = [];
  for (const [field, change] of Object.entries(metadata)) {
    if (change && typeof change === 'object' && 'before' in change && 'after' in change) {
      const { before, after } = change as { before: unknown; after: unknown };
      lines.push(`${field} : ${formatValue(before)} → ${formatValue(after)}`);
    }
  }
  return lines;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  return typeof v === 'string' ? v : JSON.stringify(v);
}
