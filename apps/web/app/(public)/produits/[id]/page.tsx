import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bike, Clock, ShoppingBag, Wallet } from 'lucide-react';
import { apiClient } from '@lilia/api-client';
import type { Product } from '@lilia/types';
import {
  coverImage,
  formatDeliveryTime,
  galleryImages,
  priceLabel,
  startingPrice,
} from '@lilia/utils';
import { ProductPurchase } from '@/components/products/product-purchase';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { RestaurantReviews } from '@/components/restaurants/restaurant-reviews';
import { getVendorMenu } from '@/lib/vendor-menu';
import { serviceModesOf } from '@/lib/service-modes';
import { DeliveryFeeText } from '@/components/restaurants/delivery-fee-text';
import { ServiceModeTags } from '@/components/restaurants/service-mode-tags';
import { ProductFacts } from '@/components/products/product-facts';
import { TrackProductView } from '@/components/analytics/track-product-view';
import { BreadcrumbJsonLd, ProductJsonLd } from '@/components/seo/json-ld';
import { PageLoadError } from '@/components/ui/page-load-error';
import { readResultFromError, type ReadResult } from '@/lib/read-result';
import { reportServerReadFailure, serverReadSignal } from '@/lib/server-read';
import { SITE_URL } from '@/lib/site';

const getProductVendor = cache(getVendorMenu);

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
const getProduct = cache(async (id: string): Promise<ReadResult<Product>> => {
  try {
    return {
      kind: 'found',
      value: await apiClient<Product>(`/products/${id}`, { signal: serverReadSignal() }),
    };
  } catch (error) {
    const result = readResultFromError(error);
    if (result.kind === 'unavailable') reportServerReadFailure(`produit ${id}`, error);
    return result;
  }
});

// ⚠️ `startingPrice` vivait ici, en double de la règle de la carte
// (`variants[0].prix`), avec un résultat différent : pour un plat à trois
// tailles, la carte pouvait annoncer 1 500 XAF et cette fiche 1 000 XAF. La
// règle est désormais unique — `@lilia/utils` — et partagée avec l'application.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProduct(id);
  // Une fiche introuvable ne doit surtout pas être indexée : sans `noindex`, un
  // produit retiré du catalogue laisse une page vide dans l'index. Même règle
  // que la page vendeur.
  if (result.kind === 'missing') {
    return { title: 'Produit introuvable', robots: { index: false, follow: false } };
  }
  // Une panne ne dit rien du produit : pas de `noindex`.
  if (result.kind === 'unavailable') {
    return { title: 'Produit', alternates: { canonical: `/produits/${id}` } };
  }
  const product = result.value;

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
  const result = await getProduct(id);

  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return <PageLoadError title="Impossible de charger ce produit." />;
  }
  const product = result.value;

  const vendor = product.restaurant ?? null;
  const vendorName = vendor?.nom ?? null;
  const price = startingPrice(product);
  const inStock =
    product.isAvailable !== false &&
    (product.stockRestant === null || (product.stockRestant ?? 0) > 0);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
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

      <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 lg:px-8">
        <Breadcrumbs
          links={[
            { label: 'Accueil', href: '/' },
            {
              label: vendorName ?? 'Nos vendeurs',
              href: vendorName ? `/restaurants/${product.restaurantId}` : '/restaurants',
            },
          ]}
          current={product.nom}
        />
        <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-10">
          <div>
            <ImageCarousel
              images={galleryImages(product, product.nom)}
              className="bg-cream-200 aspect-[4/3] w-full rounded-2xl"
              priority
              thumbnails
              sizes="(min-width: 1024px) 50vw, 100vw"
              fallback={
                <div className="bg-cream-200 grid aspect-[4/3] place-items-center rounded-2xl">
                  <ShoppingBag className="text-ink-300 size-12" aria-hidden />
                </div>
              }
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <header>
              <div className="mb-3 flex flex-wrap gap-2 text-sm font-semibold">
                {vendorName && (
                  <Link
                    href={`/restaurants/${product.restaurantId}`}
                    className="bg-tomato-50 text-tomato-700 rounded-full px-3 py-1 hover:underline"
                  >
                    {vendorName}
                  </Link>
                )}
                {product.category?.nom && (
                  <span className="text-ink-700 rounded-full bg-white px-3 py-1">
                    {product.category.nom}
                  </span>
                )}
              </div>
              <h1 className="font-display text-ink-900 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
                {product.nom}
              </h1>
              {product.description?.trim() && (
                <p className="text-ink-700 mt-4 text-base leading-relaxed whitespace-pre-line">
                  {product.description.trim()}
                </p>
              )}
            </header>

            <ProductPurchase product={product} vendor={vendor} />
            <Suspense fallback={null}>
              <ProductServiceInfo vendorId={product.restaurantId} />
            </Suspense>
            <ProductFacts product={product} vendor={vendor} />
          </div>
        </div>
        <div className="mt-12 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.52fr)] lg:gap-10">
          <Suspense fallback={<div aria-hidden className="skeleton h-40" />}>
            <RestaurantReviews restaurantId={product.restaurantId} title="Avis sur le vendeur" />
          </Suspense>
          <Suspense fallback={<div aria-hidden className="skeleton h-40" />}>
            <RelatedProducts product={product} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function ProductServiceInfo({ vendorId }: { vendorId: string }) {
  const result = await getProductVendor(vendorId);
  if (result.kind !== 'found') return null;
  const vendor = result.value;
  const modes = serviceModesOf(vendor);

  return (
    <div
      className="text-ink-700 flex flex-wrap gap-x-4 gap-y-2 text-sm"
      aria-label="Services du vendeur"
      role="group"
    >
      {modes.delivery && (
        <>
          <span className="flex items-center gap-1.5">
            <Clock className="text-tomato-700 size-4" aria-hidden />
            {formatDeliveryTime(vendor.estimatedDeliveryTimeMin, vendor.estimatedDeliveryTimeMax)}
          </span>
          <span className="flex items-center gap-1.5">
            <Bike className="text-tomato-700 size-4" aria-hidden />
            <DeliveryFeeText fixedDeliveryFee={vendor.fixedDeliveryFee} prefix="Livraison" />
          </span>
        </>
      )}
      <ServiceModeTags modes={modes} />
      <span className="flex items-center gap-1.5">
        <Wallet className="text-tomato-700 size-4" aria-hidden /> MTN MoMo / Airtel Money
      </span>
    </div>
  );
}

async function RelatedProducts({ product }: { product: Product }) {
  const result = await getProductVendor(product.restaurantId);
  if (result.kind !== 'found') return null;

  const vendor = result.value;
  const related = (vendor.products ?? []).filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <section
      aria-labelledby="related-products"
      className="border-ink-100 rounded-2xl border bg-white p-5"
    >
      <h2 id="related-products" className="font-display text-ink-900 text-xl font-extrabold">
        Du même vendeur
      </h2>
      {related.length > 0 && (
        <ul className="divide-ink-100 mt-3 divide-y">
          {related.map((item) => (
            <li key={item.id}>
              <Link
                href={`/produits/${item.id}`}
                className="text-ink-900 hover:text-tomato-700 flex items-center gap-3 py-3"
              >
                <div className="bg-cream-200 size-14 shrink-0 overflow-hidden rounded-lg">
                  <ImageCarousel
                    images={galleryImages(item, '').slice(0, 1)}
                    className="size-full"
                    sizes="56px"
                    fallback={<ShoppingBag className="text-ink-500 m-4 size-6" aria-hidden />}
                  />
                </div>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.nom}</span>
                  <span className="text-tomato-700 block text-sm font-bold">
                    {priceLabel(item)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/restaurants/${vendor.id}`}
        className="text-tomato-700 mt-4 inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
      >
        Voir la carte de {vendor.nom}
      </Link>
    </section>
  );
}
