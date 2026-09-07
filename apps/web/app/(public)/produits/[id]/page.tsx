import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@lilia/api-client';
import type { Product } from '@lilia/types';
import { coverImage, priceLabel, startingPrice } from '@lilia/utils';
import { ProductPurchase } from '@/components/products/product-purchase';
import { ProductFacts } from '@/components/products/product-facts';
import { TrackProductView } from '@/components/analytics/track-product-view';
import { BreadcrumbJsonLd, ProductJsonLd } from '@/components/seo/json-ld';
import { SITE_URL } from '@/lib/site';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Le produit, son vendeur (`id`, `nom`, `isOpen`, `preorderLeadHours`) et son
 * verdict de disponibilité — **en un seul appel**.
 *
 * `GET /products/:id` est public et filtre déjà côté serveur
 * (`PUBLIC_VENDOR_WHERE` + `deletedAt: null`) : un produit retiré du catalogue,
 * ou appartenant à un vendeur non approuvé, n'existe pas pour cette page. Un
 * produit simplement indisponible ou hors de sa fenêtre horaire, lui, reste
 * consultable — c'est voulu : le client doit pouvoir lire la fiche et l'horaire
 * de vente d'une viennoiserie à 15 h.
 *
 * ⚠️ **Pas de `'use cache'` ici, contrairement à la page vendeur.** Trois des
 * champs lus sont périssables — `stockRestant`, `restaurant.isOpen` et
 * `availableNow`. Une réponse mise en cache une heure proposerait d'ajouter au
 * panier un plat épuisé, ou une viennoiserie dont la vente est close depuis
 * midi. Sur une fiche produit, une donnée fraîche vaut mieux qu'une page
 * instantanée.
 *
 * `cache()` de React ne met **pas** en cache entre requêtes : il déduplique les
 * appels d'un même rendu. C'est exactement ce qu'il faut ici, où
 * `generateMetadata` et la page demandent le même produit.
 */
const getProduct = cache(async (id: string): Promise<Product | null> => {
  try {
    return await apiClient<Product>(`/products/${id}`);
  } catch {
    return null;
  }
});

// ⚠️ `startingPrice` vivait ici, en double de la règle de la carte
// (`variants[0].prix`), avec un résultat différent : pour un plat à trois
// tailles, la carte pouvait annoncer 1 500 XAF et cette fiche 1 000 XAF. La
// règle est désormais unique — `@lilia/utils` — et partagée avec l'application.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  // Une fiche introuvable ne doit surtout pas être indexée : sans `noindex`, un
  // produit retiré du catalogue laisse une page vide dans l'index. Même règle
  // que la page vendeur.
  if (!product) {
    return { title: 'Produit introuvable', robots: { index: false, follow: false } };
  }

  const vendorName = product.restaurant?.nom;
  const description =
    product.description?.trim() ||
    (vendorName
      ? `Commander ${product.nom} chez ${vendorName} à Brazzaville. Livraison et paiement Mobile Money avec Lilia Food.`
      : `Commander ${product.nom} à Brazzaville. Livraison et paiement Mobile Money avec Lilia Food.`);

  const image = coverImage(product);

  return {
    title: vendorName ? `${product.nom} — ${vendorName}` : product.nom,
    description,
    alternates: { canonical: `/produits/${id}` },
    openGraph: {
      title: `${product.nom} — Lilia Food`,
      description,
      url: `${SITE_URL}/produits/${id}`,
      type: 'website',
      // La photo du plat fait une bien meilleure vignette de partage que
      // l'image générique du site.
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProduitPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const vendor = product.restaurant ?? null;
  const vendorName = vendor?.nom ?? null;
  const price = startingPrice(product);
  const inStock =
    product.isAvailable !== false &&
    (product.stockRestant === null || (product.stockRestant ?? 0) > 0);

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Seul émetteur de `product_view` du site : la fiche est ouverte, donc
          le produit est consulté. Les lignes de menu n'émettent rien. */}
      <TrackProductView
        productId={product.id}
        productName={product.nom}
        restaurantId={product.restaurantId}
        price={price}
      />
      <ProductJsonLd
        id={product.id}
        nom={product.nom}
        description={product.description}
        imageUrl={coverImage(product)}
        price={price}
        vendorName={vendorName}
        inStock={inStock}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: 'Vendeurs', path: '/restaurants' },
          ...(vendorName
            ? [{ name: vendorName, path: `/restaurants/${product.restaurantId}` }]
            : []),
          { name: product.nom, path: `/produits/${product.id}` },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Retour vers le vendeur, et non `history.back()` : on arrive aussi
            ici depuis un partage ou un résultat de recherche, où il n'y a
            rien derrière. */}
        <Link
          href={`/restaurants/${product.restaurantId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition-colors hover:text-tomato-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {vendorName ? `Retour à ${vendorName}` : 'Retour au vendeur'}
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Achat — le seul bloc client de la page */}
          <div>
            <ProductPurchase product={product} vendor={vendor} />
          </div>

          {/* Description et caractéristiques — rendus sur le serveur */}
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              {product.category?.nom && (
                <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  {product.category.nom}
                </span>
              )}
              <h1
                className="text-2xl font-bold text-ink-900 sm:text-3xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {product.nom}
              </h1>
              {/* Même règle que la carte et que l'application : une seule
                  fonction, pas trois expressions qui finissent par diverger. */}
              <p className="text-xl font-extrabold text-tomato-700">
                {priceLabel(product)}
              </p>
              {vendorName && (
                <Link
                  href={`/restaurants/${product.restaurantId}`}
                  className="group inline-flex w-fit items-center gap-1 text-sm text-ink-700 hover:text-tomato-700"
                >
                  Vendu par <span className="font-semibold">{vendorName}</span>
                  <ChevronRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              )}
            </header>

            {product.description?.trim() && (
              // La liste du menu tronque à deux lignes ; c'est ici qu'on lit
              // la description entière — c'est la raison d'être de la fiche.
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {product.description.trim()}
              </p>
            )}

            <ProductFacts product={product} vendor={vendor} />
          </div>
        </div>
      </div>
    </div>
  );
}
