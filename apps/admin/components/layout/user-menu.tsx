'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { getFirebaseAuth } from '@/lib/firebase';
import { clearSessionCookie } from '@/lib/session';
import { useAuthStore } from '@/store/auth';

/**
 * Menu utilisateur du bandeau supérieur — profil et déconnexion.
 *
 * Il existe parce que la déconnexion ne doit pas dépendre de la place restante
 * en bas d'une liste de navigation qui s'allonge à chaque fonctionnalité. Le
 * bouton de la sidebar était correct et câblé ; il sortait simplement de
 * l'écran pour les comptes ADMIN (15 entrées de menu) sur toute fenêtre de
 * moins de ~870 px de haut. Le débordement est corrigé, mais un second point
 * de sortie, à une place stable et indépendante du nombre d'entrées, est ce
 * qui empêche le problème de revenir.
 *
 * L'intitulé « Déconnexion » est écrit en toutes lettres à côté de l'icône :
 * une icône seule se devine, elle ne se lit pas.
 */
export function UserMenu() {
  const router = useRouter();
  const { user, signOut: clearStore } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à Échap — un menu qu'on ne sait pas fermer
  // au clavier est un piège pour qui n'utilise pas la souris.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      // Ordre imposé : Firebase d'abord (c'est lui la session), puis l'état
      // local, puis le cookie serveur qui garde l'accès aux routes protégées.
      await signOut(getFirebaseAuth());
      clearStore();
      await clearSessionCookie();
      // `replace` et non `push` : le retour arrière ne doit pas ramener sur une
      // page d'administration, même vide.
      router.replace('/connexion');
    } catch {
      setBusy(false);
      toast.error('Erreur lors de la déconnexion');
    }
  }

  const initiale = user.nom?.charAt(0)?.toUpperCase() ?? 'A';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du compte"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary-500/30 bg-primary-500/20 text-xs font-semibold text-primary-500">
          {user.imageUrl ? (
            // next/image désactivé sur l'admin (URLs libres) — cf. CLAUDE.local.md
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initiale
          )}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
          {user.nom ?? 'Mon compte'}
        </span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.nom ?? 'Mon compte'}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {user.role}
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push('/profil');
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <UserIcon size={15} />
            Mon profil
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 border-t border-zinc-100 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-zinc-800 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut size={15} />
            {busy ? 'Déconnexion…' : 'Déconnexion'}
          </button>
        </div>
      )}
    </div>
  );
}
