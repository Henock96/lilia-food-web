/** F3-07 — versement parti seul (échéance passée) ou geste d'un administrateur. */
export function payoutTriggerLabel(p: {
  requestedBy: string | null;
  metadata?: { trigger?: string } & Record<string, unknown>;
}): 'automatique' | 'manuel' {
  return p.metadata?.trigger === 'AUTO' || p.requestedBy === null
    ? 'automatique'
    : 'manuel';
}
