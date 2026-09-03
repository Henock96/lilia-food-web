import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou sur l'accessibilité de la déconnexion.
 *
 * Le bouton « Déconnexion » existait, était correctement câblé — et restait
 * **invisible** pour les comptes ADMIN sur toute fenêtre de moins d'environ
 * 870 px de haut, c'est-à-dire sur n'importe quel portable 13 pouces.
 *
 * Le mécanisme : l'`aside` est étiré à `100vh` par le layout ; sa `<nav>` porte
 * `flex-1`, mais en direction colonne le `min-height: auto` d'un élément flex
 * l'empêche de rétrécir sous la hauteur de son contenu. Avec les 15 entrées
 * d'un ADMIN, la navigation mesure ~660 px et l'`aside` ~868 px au total : le
 * bloc de déconnexion, dernier enfant, sortait de la boîte et était rogné par
 * l'`overflow-hidden` du parent. Un RESTAURATEUR, avec 8 entrées, ne voyait
 * jamais le problème — d'où un défaut qui ne se reproduisait que sur certains
 * comptes et certains écrans.
 *
 * Ces tests lisent la source plutôt que de rendre le composant : ils ne
 * remplacent pas un essai en navigateur, mais ils empêchent la régression
 * exacte qui a produit le défaut — le retrait des classes de défilement, ou la
 * disparition du second point de sortie. C'est ce qu'un test peut garantir sans
 * ajouter jsdom et testing-library au projet.
 */
const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('Sidebar — la navigation ne peut plus rogner la déconnexion', () => {
  const sidebar = read('components/layout/sidebar.tsx');

  it('la <nav> défile au lieu de déborder', () => {
    const nav = sidebar.match(/<nav className="([^"]+)"/)?.[1];
    expect(nav, 'balise <nav> introuvable dans la sidebar').toBeDefined();
    // `min-h-0` lève le `min-height: auto` du flex, `overflow-y-auto` rend le
    // dépassement atteignable. L'un sans l'autre ne corrige rien.
    expect(nav).toContain('min-h-0');
    expect(nav).toContain('overflow-y-auto');
  });

  it('le bouton de déconnexion est toujours présent et câblé', () => {
    expect(sidebar).toContain('Déconnexion');
    expect(sidebar).toContain('onClick={handleSignOut}');
  });

  it('la déconnexion coupe les trois sessions : Firebase, store, cookie', () => {
    const handler = sidebar.slice(
      sidebar.indexOf('async function handleSignOut'),
      sidebar.indexOf('async function handleSignOut') + 500,
    );
    expect(handler).toContain('signOut(getFirebaseAuth())');
    expect(handler).toContain('clearStore()');
    expect(handler).toContain('clearSessionCookie()');
    // `replace` et non `push` : le retour arrière ne doit pas ramener sur une
    // page d'administration.
    expect(handler).toContain("router.replace('/connexion')");
  });
});

describe('Header — second point de sortie, indépendant de la navigation', () => {
  const header = read('components/layout/header.tsx');
  const menu = read('components/layout/user-menu.tsx');

  /**
   * La correction CSS suffit aujourd'hui. Le menu utilisateur existe pour que
   * la déconnexion cesse de dépendre de la place restante en bas d'une liste
   * qui s'allonge à chaque fonctionnalité livrée.
   */
  it('le header monte le menu utilisateur', () => {
    expect(header).toContain('<UserMenu />');
  });

  it('le menu porte « Déconnexion » en toutes lettres, pas seulement une icône', () => {
    expect(menu).toContain('Déconnexion');
    expect(menu).toContain('Mon profil');
  });

  it('le menu coupe les mêmes trois sessions', () => {
    expect(menu).toContain('signOut(getFirebaseAuth())');
    expect(menu).toContain('clearStore()');
    expect(menu).toContain('clearSessionCookie()');
    expect(menu).toContain("router.replace('/connexion')");
  });
});

describe('Routes protégées — le cookie est la porte, le backend l’autorisation', () => {
  const proxy = read('proxy.ts');

  it('toute route hors /connexion exige le cookie de session', () => {
    expect(proxy).toContain("PUBLIC_PATHS = ['/connexion']");
    expect(proxy).toContain("request.cookies.get('firebase-token')");
    expect(proxy).toContain("new URL('/connexion', request.url)");
  });

  /**
   * Après déconnexion, `DELETE /api/auth/session` vide le cookie : le middleware
   * redirige donc toute route protégée vers `/connexion`, y compris si
   * l'utilisateur en tape l'URL directement.
   */
  it('la route de session sait supprimer le cookie', () => {
    const route = read('app/api/auth/session/route.ts');
    expect(route).toContain('export async function DELETE');
    expect(route).toContain('maxAge: 0');
    expect(route).toContain('httpOnly: true');
  });
});
