'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { MenuDuJour } from '@lilia/types';
import { coverImage, formatCurrency } from '@lilia/utils';
import { useAddMenuToCart } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { analytics } from '@/lib/analytics';

/**
 * **Menus du jour d'un vendeur** — COMBO (plusieurs produits) ou PLAT_SPECIAL.
 *
 * Le site ne les affichait pas du tout : sa route de détail (`/restaurants/:id`)
 * ne les servait pas, alors que l'administration sait les créer et que
 * l'application les affiche depuis toujours. Un vendeur composait donc une offre
 * visible sur une plateforme sur deux, et **non commandable** sur l'autre.
 *
 * Ce composant lit `restaurant.menuDuJour`, servi par la carte canonique. Le
 * serveur a déjà filtré sur `isActive` et sur la fenêtre `dateDebut/dateFin` :
 * ce qui arrive ici est actif **maintenant**, on ne refait pas ce calcul.
 *
 * ⚠️ Un menu porte **son propre prix et son propre stock**, distincts de ceux de
 * ses composants. On l'ajoute au panier par `POST /cart/add-menu`, jamais comme
 * une suite de produits : le sous-total serait faux.
 */
export function DailyMenus({
  menus,
  restaurantOpen,
}: {
  menus: MenuDuJour[];
  restaurantOpen: boolean;
}) {
  if (menus.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="menus-du-jour">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-tomato-600" aria-hidden />
        <h2
          id="menus-du-jour"
          className="font-display text-lg font-bold text-ink-900"
        >
          {menus.length > 1 ? 'Menus du jour' : 'Menu du jour'}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {menus.map((menu) => (
          <MenuCard key={menu.id} menu={menu} restaurantOpen={restaurantOpen} />
        ))}
      </div>
    </section>
  );
}

function MenuCard({
  menu,
  restaurantOpen,
}: {
  menu: MenuDuJour;
  restaurantOpen: boolean;
}) {
  const { token } = useAuthStore();
  const addMenu = useAddMenuToCart(token);
  const [added, setAdded] = useState(false);

  // Même convention que les produits : `null` = illimité, `0` = épuisé. Un
  // `?? 0` transformerait « illimité » en « épuisé ».
  const isOutOfStock = menu.stockRestant !== null && menu.stockRestant === 0;
  const canAdd = restaurantOpen && !isOutOfStock;
  const cover = coverImage(menu);

  /** Composition : les produits du COMBO, ou les ingrédients du PLAT_SPECIAL. */
  const composition =
    menu.products && menu.products.length > 0
      ? menu.products
          .map((mp) => mp.product?.nom)
          .filter(Boolean)
          .join(' · ')
      : (menu.ingredients ?? null);

  async function handleAdd() {
    if (!token) {
      toast.error('Connectez-vous pour ajouter au panier');
      return;
    }
    try {
      await addMenu.mutateAsync({ menuId: menu.id, quantite: 1 });
      // `add_to_cart` émis **après** l'acceptation du serveur, comme sur les
      // produits : compter le clic ferait apparaître des ajouts qui n'ont pas
      // eu lieu, et le tunnel décrocherait sans raison visible.
      analytics.track('add_to_cart', {
        product_id: menu.id,
        product_name: menu.nom,
        restaurant_id: menu.restaurantId,
        price: menu.prix,
        quantity: 1,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success(`${menu.nom} ajouté au panier`);
    } catch (err: unknown) {
      // Le message du serveur dit ce qui ne va pas (« panier d'un autre
      // vendeur », « menu épuisé ») ; un libellé maison ne ferait que
      // constater l'échec.
      toast.error(
        (err as { message?: string }).message ?? 'Impossible d’ajouter au panier',
      );
    }
  }

  return (
    <article className="bg-white rounded-xl border border-tomato-200 p-4 flex gap-4">
      {cover && (
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-cream-200">
          <Image
            src={cover}
            alt={menu.nom}
            fill
            sizes="96px"
            className={`object-cover ${isOutOfStock ? 'opacity-60' : ''}`}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-ink-900 text-sm leading-snug">
              {menu.nom}
            </h3>
            {menu.description && (
              <p className="text-ink-500 text-xs mt-1 line-clamp-2">
                {menu.description}
              </p>
            )}
            {composition && (
              <p className="text-ink-400 text-xs mt-1 line-clamp-2">
                {composition}
              </p>
            )}
          </div>
          {isOutOfStock && (
            <span className="px-2 py-0.5 bg-ink-500 text-white text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
              Épuisé
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Le prix du menu, pas la somme de ses composants. */}
          <span className="text-tomato-700 font-extrabold">
            {formatCurrency(menu.prix)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || addMenu.isPending}
            aria-label={`Ajouter ${menu.nom} au panier`}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              canAdd
                ? added
                  ? 'bg-success text-white'
                  : 'bg-tomato-600 hover:bg-tomato-700 text-white shadow-sm'
                : 'bg-cream-200 text-ink-300 cursor-not-allowed'
            }`}
          >
            {added ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
