import { redirect } from 'next/navigation';
import { pushRoute } from '@/lib/push-routes';

/**
 * Atterrissage d'un clic sur une notification push quand aucun onglet du site
 * n'est ouvert (`public/push-sw.js`). Traduit les `data` du message en page,
 * côté serveur, sans rien rendre.
 */
export default async function OpenNotificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') data[key] = value;
  }
  redirect(pushRoute(data));
}
