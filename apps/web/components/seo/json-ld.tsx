import { CONTACT, SITE_URL, SOCIAL_LINKS } from '@/lib/site';

/**
 * Données structurées schema.org.
 *
 * Le site n'en exposait aucune. Sans elles, Google ne dispose d'aucun signal
 * explicite sur la nature de Lilia Food, sa zone de service ou ses
 * coordonnées — ce qui pèse particulièrement sur le référencement local, où
 * l'ancrage géographique est le critère décisif.
 *
 * Le JSON est injecté via `dangerouslySetInnerHTML` : c'est la méthode
 * recommandée par Next.js pour le JSON-LD. Aucune donnée utilisateur n'entre
 * ici — tout provient de constantes ou de données vendeur déjà publiques —
 * et `JSON.stringify` échappe les caractères de contrôle. On neutralise tout
 * de même `<` pour qu'aucune valeur venant de l'API ne puisse fermer la
 * balise `<script>` prématurément.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

const SAME_AS = [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook].filter(
  (url): url is string => Boolean(url),
);

/** Identité de l'entreprise + zone réellement desservie. */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Lilia Food',
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        description:
          'Marketplace locale de livraison à Brazzaville : restaurants, cuisines maison, boulangeries et boissons.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: CONTACT.city,
          addressCountry: CONTACT.country,
        },
        areaServed: {
          '@type': 'City',
          name: CONTACT.city,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: CONTACT.phonePrimary.e164,
          email: CONTACT.email,
          contactType: 'customer service',
          areaServed: CONTACT.country,
          availableLanguage: ['fr'],
        },
        ...(SAME_AS.length > 0 ? { sameAs: SAME_AS } : {}),
      }}
    />
  );
}

/** Déclare le site lui-même, rattaché à l'organisation. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Lilia Food',
        inLanguage: 'fr',
        publisher: { '@id': `${SITE_URL}/#organization` },
      }}
    />
  );
}

/**
 * Fiche vendeur. `servesCuisine` et les horaires ne sont émis que lorsque la
 * donnée existe : un champ schema.org vide vaut moins que son absence.
 */
export function VendorJsonLd({
  id,
  nom,
  adresse,
  imageUrl,
  specialties,
}: {
  id: string;
  nom: string;
  adresse?: string | null;
  imageUrl?: string | null;
  specialties?: string[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: nom,
        url: `${SITE_URL}/restaurants/${id}`,
        ...(imageUrl ? { image: imageUrl } : {}),
        address: {
          '@type': 'PostalAddress',
          ...(adresse ? { streetAddress: adresse } : {}),
          addressLocality: CONTACT.city,
          addressCountry: CONTACT.country,
        },
        ...(specialties && specialties.length > 0
          ? { servesCuisine: specialties }
          : {}),
        priceRange: 'XAF',
        parentOrganization: { '@id': `${SITE_URL}/#organization` },
      }}
    />
  );
}

/** FAQ de /support — éligible aux résultats enrichis Google. */
export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}

/** Fil d'Ariane — améliore l'affichage de l'URL dans les résultats. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
      }}
    />
  );
}
