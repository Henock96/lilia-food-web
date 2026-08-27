import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';

/**
 * Vendeurs du marketplace `/vendors` (déjà filtré adminApproved + isActive
 * côté backend, LIL-119). Partagé entre le hero et la section « Les plus
 * courus » de la home, pour un seul appel réseau : `'use cache'` mémoïse
 * l'appel par signature de fonction + arguments au sein d'un même rendu
 * (Cache Components / dynamicIO, actif via `cacheComponents: true` dans
 * `next.config.ts`), donc les deux appelants n'en déclenchent qu'un.
 */
export async function getVendors(): Promise<Restaurant[]> {
  'use cache';
  try {
    const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=12');
    return res.data ?? [];
  } catch {
    return [];
  }
}
