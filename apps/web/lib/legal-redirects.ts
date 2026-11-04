/**
 * Redirections des documents légaux, servies par `next.config.ts`.
 *
 * `/privacy-policy-cgu` est l'ancien document combiné (v1.0, mai 2026),
 * remplacé en août par `/conditions` et `/confidentialite`. Il restait en
 * ligne avec ses chiffres d'origine (8 % de frais de service, 1 point = 5 XAF)
 * et pouvait être l'URL déclarée sur une fiche de store : on le redirige vers
 * la politique de confidentialité plutôt que de maintenir trois textes.
 */
export function legalRedirects() {
  return [
    {
      source: '/privacy-policy-cgu',
      destination: '/confidentialite',
      permanent: true,
    },
  ];
}
