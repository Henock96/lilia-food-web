/**
 * Lien d'évitement — premier élément focusable de la page.
 *
 * Sans lui, une personne naviguant au clavier ou au lecteur d'écran devait
 * parcourir l'intégralité de l'en-tête (logo, quatre liens, panier, compte,
 * menu) sur chaque page avant d'atteindre le contenu. Critère WCAG 2.4.1.
 *
 * Visuellement masqué tant qu'il n'a pas le focus : `sr-only` le sort du flux,
 * `focus:not-sr-only` le réaffiche dès la première tabulation.
 */
export function SkipLink() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-tomato-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:ring-offset-2"
    >
      Aller au contenu
    </a>
  );
}
