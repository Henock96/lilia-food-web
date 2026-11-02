import type { ReorderResult } from '@lilia/api-client';

export function reorderFeedback({ summary }: ReorderResult) {
  const { totalAdded, totalUnavailable, totalErrors } = summary;
  if (totalAdded === 0) {
    return { kind: 'none' as const, message: 'Aucun article n’a été ajouté au panier.', navigate: false };
  }
  if (totalUnavailable + totalErrors > 0) {
    return { kind: 'partial' as const, message: `Réachat partiel : ${totalAdded} ligne${totalAdded > 1 ? 's' : ''} ajoutée${totalAdded > 1 ? 's' : ''} au panier.`, navigate: false };
  }
  return { kind: 'complete' as const, message: 'Articles ajoutés au panier !', navigate: true };
}
