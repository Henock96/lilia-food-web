import type {
  AdminCapability,
  FinancialApproval,
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
    case 'REFUND_EXECUTION':
      return {
        title: `Remboursement de ${(a.amountXaf ?? 0).toLocaleString('fr-FR')} FCFA`,
        detail: 'Le virement part vers le numéro qui a payé la commande.',
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
