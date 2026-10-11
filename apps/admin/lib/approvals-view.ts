import type {
  AdminCapability,
  FinancialApproval,
  FinancialSettingKey,
} from '@lilia/types';

/**
 * Lecture d'une demande d'approbation (F3-08). Fonctions pures, testées : la
 * page ne fait que les afficher.
 */

export const CAPABILITY_LABELS: Record<AdminCapability, string> = {
  FINANCE_EXECUTE: 'Faire partir de l’argent',
  FINANCE_APPROVE: 'Approuver un geste financier',
  USER_ROLES: 'Rôles et comptes',
  SETTINGS: 'Paramètres et tarifs',
  SUPPORT: 'Opérations courantes',
};

/** R-09 — libellés des réglages d'argent (miroir du résumé serveur). */
const FINANCIAL_SETTING_LABELS: Record<FinancialSettingKey, string> = {
  serviceFeePercent: 'Frais de service',
  groceryServiceFeeBps: 'Frais de service épiceries',
  restaurantCommissionPercent: 'Commission par défaut',
  loyaltyPointValueXaf: 'Valeur du point',
  loyaltyPointsPerOrder: 'Points par commande',
  loyaltyMinRedemption: 'Seuil de dépense des points',
  referrerBonusPoints: 'Bonus de parrainage',
  vendorPayoutAutoEnabled: 'Versements automatiques',
  vendorPayoutDelayMinutes: 'Délai avant versement',
  deliveryPricingMode: 'Tarification de la livraison',
};

function formatFinancialValue(key: FinancialSettingKey, value: unknown): string {
  switch (key) {
    case 'serviceFeePercent':
    case 'restaurantCommissionPercent':
      return `${String(value)} %`;
    case 'groceryServiceFeeBps':
      return value === null || value === undefined ? 'taux général' : `${Number(value) / 100} %`;
    case 'loyaltyPointValueXaf':
      return `${String(value)} XAF`;
    case 'loyaltyPointsPerOrder':
    case 'loyaltyMinRedemption':
    case 'referrerBonusPoints':
      return `${String(value)} pts`;
    case 'vendorPayoutAutoEnabled':
      return value ? 'activés' : 'désactivés';
    case 'vendorPayoutDelayMinutes':
      return `${String(value)} min`;
    case 'deliveryPricingMode':
      return value === 'PLATFORM' ? 'grille plateforme' : 'prix du vendeur';
  }
}

const commissionLabel = (v: unknown) =>
  v === null || v === undefined ? 'taux plateforme' : `${String(v)} %`;

/** Ce que le second administrateur doit vérifier avant d'approuver. */
export function describeApproval(a: FinancialApproval): {
  title: string;
  detail: string;
} {
  const p = a.payload;
  switch (a.kind) {
    case 'PAYOUT_ACCOUNT_CHANGE':
      return {
        title: 'Changement du numéro de versement d’un vendeur',
        // Le numéro complet : c'est lui qu'il faut vérifier auprès du vendeur
        // (par un autre canal que celui qui a servi à la demande).
        detail: `Nouveau numéro : ${String(p.payoutPhoneNumber ?? '?')} (${String(
          p.payoutProvider ?? '?',
        )})${p.payoutAccountName ? ` — titulaire ${String(p.payoutAccountName)}` : ''}`,
      };
    case 'REFUND_EXECUTION': {
      const amount = `${(a.amountXaf ?? 0).toLocaleString('fr-FR')} FCFA`;
      const notes = typeof p.notes === 'string' && p.notes ? ` — note : ${p.notes}` : '';
      // R-01 — une demande de CLÔTURE déclarative (`closeAs`) : approuver
      // applique le statut, sans virement. La confondre avec un virement
      // ferait croire à l'approbateur qu'il fait partir de l'argent.
      if (p.closeAs === 'COMPLETED') {
        return {
          title: `Clôture « remboursé » de ${amount}`,
          detail: `Aucun virement : le demandeur déclare avoir remboursé le client hors application${notes}.`,
        };
      }
      if (p.closeAs === 'REJECTED') {
        return {
          title: `Refus d’un remboursement de ${amount}`,
          detail: `Le client ne sera pas remboursé${notes}.`,
        };
      }
      return {
        title: `Remboursement de ${amount}`,
        detail: 'Le virement part vers le numéro qui a payé la commande.',
      };
    }
    case 'PLATFORM_SETTINGS_CHANGE': {
      const changes = (p.changes ?? {}) as Partial<Record<FinancialSettingKey, unknown>>;
      const before = (p.before ?? {}) as Partial<Record<FinancialSettingKey, unknown>>;
      return {
        title: 'Changement de réglages qui fixent de l’argent',
        detail: (Object.keys(changes) as FinancialSettingKey[])
          .map(
            (k) =>
              `${FINANCIAL_SETTING_LABELS[k] ?? k} : ${formatFinancialValue(k, before[k])} → ${formatFinancialValue(k, changes[k])}`,
          )
          .join(' ; '),
      };
    }
    case 'VENDOR_COMMISSION_CHANGE':
      return {
        title: `Commission de ${String(p.vendorName ?? 'un vendeur')}`,
        detail: `${commissionLabel(p.before)} → ${commissionLabel(p.commissionPercent)}`,
      };
    case 'CAPABILITY_GRANT': {
      const caps = (p.capabilities as AdminCapability[] | undefined) ?? [];
      return {
        title: 'Changement des capacités d’un administrateur',
        detail: caps.length
          ? caps.map((c) => CAPABILITY_LABELS[c] ?? c).join(', ')
          : 'Aucune capacité (retrait de tous les droits)',
      };
    }
    default:
      // Un type que cette interface ne connaît pas encore (serveur plus
      // récent) : on l'annonce plutôt que de casser la file.
      return {
        title: `Demande de type ${String(a.kind)}`,
        detail:
          'Ce type de demande n’est pas encore décrit par cette version de l’administration : vérifiez-le avec le demandeur avant d’approuver.',
      };
  }
}

/**
 * Gestes proposés à l'administrateur connecté. Le demandeur ne voit jamais
 * « Approuver » (le serveur le refuserait) ; il peut retirer sa demande.
 */
export function approvalActions(
  a: FinancialApproval,
  me: { id: string; capabilities?: AdminCapability[] } | null,
): { approve: boolean; reject: boolean; withdraw: boolean } {
  if (!me || a.status !== 'PENDING') {
    return { approve: false, reject: false, withdraw: false };
  }
  if (a.requestedBy === me.id) {
    return { approve: false, reject: false, withdraw: true };
  }
  const canApprove = me.capabilities?.includes('FINANCE_APPROVE') ?? false;
  return { approve: canApprove, reject: true, withdraw: false };
}

/** « expire dans 3 h » — une demande non traitée expire au bout de 24 h. */
export function expiresLabel(expiresAt: string, now = new Date()): string {
  const minutes = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return 'expirée';
  if (minutes < 60) return `expire dans ${minutes} min`;
  return `expire dans ${Math.floor(minutes / 60)} h`;
}

/** La réponse d'un geste soumis aux 4 yeux : rien n'a encore changé. */
export function isApprovalRequested(
  res: unknown,
): res is { approvalRequired: true } {
  return (
    typeof res === 'object' &&
    res !== null &&
    (res as { approvalRequired?: unknown }).approvalRequired === true
  );
}
