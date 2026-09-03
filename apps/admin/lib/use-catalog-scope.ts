'use client';

import { create } from 'zustand';
import { useAdminVendors } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin, useMyRestaurantScoped } from '@/lib/use-role';

/**
 * Sur QUEL vendeur portent les écrans de catalogue (produits, sections, menus).
 *
 * Une seule règle, partagée par les trois pages :
 *
 *  - **RESTAURATEUR** → son vendeur. Aucun sélecteur : il n'y a rien à choisir.
 *  - **ADMIN** → le vendeur qu'il sélectionne, pris dans `GET /admin/vendors`.
 *
 * Deux choses distinctes en sortent, et les confondre est précisément ce qui a
 * cassé la création de produit :
 *
 *  - `restaurantId` — filtre de **lecture**, sans effet de droit ;
 *  - `targetRestaurantId` — champ d'**écriture**, `undefined` pour un
 *    RESTAURATEUR. Le backend ne l'accepte que d'un ADMIN et le refuse
 *    (403) autrement, plutôt que de le remplacer en silence.
 *
 * Le back-office ne transmettait jamais ce second champ : le sélecteur de
 * vendeur pilotait les listes mais aucune écriture, si bien qu'un ADMIN — qui
 * ne possède aucun vendeur — recevait « Vous devez posséder un vendeur pour
 * créer un produit ou un menu » et ne pouvait amorcer aucun catalogue.
 */

interface CatalogScopeState {
  selectedRestaurantId: string | null;
  select: (id: string | null) => void;
}

/**
 * Sélection persistée hors du cycle de vie des pages : passer de Produits à
 * Sections ne doit pas faire retomber l'admin sur un autre vendeur.
 */
const useCatalogScopeStore = create<CatalogScopeState>((set) => ({
  selectedRestaurantId: null,
  select: (id) => set({ selectedRestaurantId: id }),
}));

export interface CatalogScope {
  /** Vrai si l'appelant choisit son vendeur (ADMIN). */
  isAdmin: boolean;
  /** Filtre de lecture — le vendeur affiché, quel que soit le rôle. */
  restaurantId: string | undefined;
  /** Champ d'écriture — `undefined` pour un RESTAURATEUR. */
  targetRestaurantId: string | undefined;
  /** Vendeurs sélectionnables (ADMIN uniquement, `DRAFT` compris). */
  vendors: Restaurant[];
  /**
   * Le vendeur sur lequel on travaille, quel que soit le rôle. Exposé ici pour
   * que les pages n'aient pas à rappeler `useMyRestaurantScoped` — un hook
   * appelé derrière un ternaire casse la règle des hooks React.
   */
  activeVendor: Restaurant | undefined;
  vendorsLoading: boolean;
  select: (id: string | null) => void;
  /** L'ADMIN n'a pas encore de cible : les écrans doivent le dire. */
  needsVendor: boolean;
  /** Le RESTAURATEUR n'a aucun vendeur rattaché. */
  noRestaurant: boolean;
}

export function useCatalogScope(): CatalogScope {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { restaurant, isError } = useMyRestaurantScoped(token);
  const { selectedRestaurantId, select } = useCatalogScopeStore();

  // `GET /admin/vendors` et non `GET /restaurants` : la route publique ne rend
  // que les commerces déjà publiés — l'exact complément de ceux dont l'admin
  // doit remplir le catalogue pour pouvoir les activer.
  const vendorsQuery = useAdminVendors(isAdmin ? token : null, { limit: 100 });
  const vendors = (vendorsQuery.data?.data ?? []) as Restaurant[];

  const selected =
    selectedRestaurantId && vendors.some((v) => v.id === selectedRestaurantId)
      ? selectedRestaurantId
      : (vendors[0]?.id ?? null);

  const restaurantId = isAdmin ? (selected ?? undefined) : restaurant?.id;

  return {
    isAdmin,
    restaurantId,
    activeVendor: isAdmin
      ? vendors.find((v) => v.id === restaurantId)
      : (restaurant ?? undefined),
    // C'est ICI que se joue la règle : un RESTAURATEUR n'envoie rien.
    targetRestaurantId: isAdmin ? restaurantId : undefined,
    vendors,
    vendorsLoading: isAdmin && vendorsQuery.isLoading,
    select,
    needsVendor: isAdmin && !restaurantId && !vendorsQuery.isLoading,
    noRestaurant: !isAdmin && isError,
  };
}
