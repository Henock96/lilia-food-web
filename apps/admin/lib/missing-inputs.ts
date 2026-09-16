/**
 * Traduction des postes de coût que le serveur déclare manquants.
 *
 * ## Pourquoi ce fichier existe
 *
 * `GET /admin/orders/:id/financials` rend `contributionMargin: null` dès qu'un
 * poste obligatoire est inconnu, et nomme les coupables dans `missingInputs`.
 * Il ne les remplace **jamais** par zéro : écrire `driverCost = 0`
 * transformerait « inconnu » en « gratuit » et produirait une marge
 * systématiquement surestimée, avec l'air d'être exacte.
 *
 * L'écran doit donc dire *pourquoi* il ne conclut pas. Avant, il affichait
 * « Marge connue après facturation prestataire » — vrai quand seuls les frais
 * du prestataire pouvaient manquer, faux depuis que le coût du livreur est
 * reconnu absent : aucune facturation ne le fera apparaître, et le message
 * envoyait l'administrateur attendre une information qui n'arrivera jamais.
 *
 * Extrait dans `lib/` plutôt que laissé dans le composant pour la raison
 * habituelle de ce dépôt : une règle enfermée dans une closure de rendu est
 * hors de portée de tout test.
 */

/** Postes connus de cette version du front. */
const MISSING_INPUT_LABELS: Record<string, string> = {
  driverCost: 'le coût du livreur',
  collectionFee: "les frais d'encaissement",
  payoutFee: 'les frais de reversement',
};

/**
 * Énumère en français ce qui empêche de calculer la contribution.
 *
 * Un poste inconnu de cette version est rendu **tel quel** plutôt que masqué :
 * le serveur peut en nommer un ajouté après ce déploiement, et mieux vaut un
 * identifiant technique à l'écran qu'une explication tronquée — laquelle
 * laisserait croire que la liste est complète.
 */
export function describeMissingInputs(keys: readonly string[] | undefined): string {
  if (!keys?.length) return 'un poste de coût';

  const labels = keys.map((key) => MISSING_INPUT_LABELS[key] ?? key);
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}
