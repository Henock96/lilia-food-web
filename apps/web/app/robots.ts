import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/restaurants', '/restaurants/'],
        disallow: ['/panier', '/commandes', '/profil', '/api/'],
      },
    ],
    sitemap: 'https://lilia-food-web.vercel.app/sitemap.xml',
  };
}
