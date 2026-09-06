/**
 * Fenêtre horaire de vente d'un produit — **affichage seulement**.
 *
 * ⚠️ Ce fichier ne décide de rien, et c'est délibéré. La question « ce produit
 * est-il vendable maintenant ? » est tranchée par le serveur, qui renvoie
 * `product.availableNow` calculé par `isWithinAvailabilityWindow`
 * (`lilia-backend/…/products/product-availability.ts`) — la fonction même
 * qu'applique le checkout pour accepter ou refuser.
 *
 * Une première version portait cette règle ici : comparaison de bornes « HH:mm »
 * dans le fuseau de Brazzaville, fenêtres à cheval sur minuit. Quinze lignes,
 * entièrement spécifiées, testées. Et deux implémentations d'une même règle
 * divergent en silence — c'est exactement ce qui s'était produit sur les
 * montants, où le client affichait 800 XAF de frais quand le serveur en
 * facturait 1 500. Le serveur calcule, le site met en forme.
 *
 * Reste donc ici la seule chose qui appartienne à l'interface : la phrase
 * qu'on montre au client.
 */

/**
 * Libellé de la fenêtre, ou `null` si le produit est vendable en permanence.
 *
 * Affiché même quand le produit est actuellement disponible : savoir qu'une
 * viennoiserie n'est vendue que le matin fait partie de sa description, pas
 * seulement de son refus.
 */
export function availabilityWindowLabel(product: {
  availableFrom?: string | null;
  availableUntil?: string | null;
}): string | null {
  const { availableFrom: from, availableUntil: until } = product;
  if (from && until) return `Disponible de ${from} à ${until}`;
  if (from) return `Disponible à partir de ${from}`;
  if (until) return `Disponible jusqu’à ${until}`;
  return null;
}
