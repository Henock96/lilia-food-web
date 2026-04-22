'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { API_URL } from '@lilia/api-client';
import type { User } from '@lilia/types';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const ALLOWED_ROLES = ['ADMIN', 'RESTAURATEUR'];

// Fetch direct avec AbortController timeout — évite le hang infini sur Render cold start
async function syncUser(token: string, email: string | null, displayName: string | null, photoURL: string | null): Promise<User> {
  const TIMEOUTS = [12000, 15000, 20000, 20000, 20000];
  const DELAYS   = [0, 3000, 5000, 8000, 10000];
  let lastErr = '';

  for (let i = 0; i < TIMEOUTS.length; i++) {
    if (DELAYS[i]! > 0) await new Promise(r => setTimeout(r, DELAYS[i]));

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUTS[i]);

    try {
      const res = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, nom: displayName, imageUrl: photoURL }),
        signal: ctrl.signal,
      });
      clearTimeout(t);

      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        lastErr = `Serveur: ${res.status} — ${(json.message as string) ?? ''}`;
        continue;
      }
      const user = (json.user ?? json.data ?? json) as User;
      return user;
    } catch (e: unknown) {
      clearTimeout(t);
      const isAbort = (e as Error).name === 'AbortError';
      lastErr = isAbort ? `Tentative ${i + 1} timeout` : `Erreur réseau: ${(e as Error).message}`;
      console.warn(`[sync] tentative ${i + 1} échouée:`, lastErr);
    }
  }
  throw new Error(`Synchronisation impossible après 5 tentatives. Dernière erreur: ${lastErr}`);
}

export default function ConnexionPage() {
  const router = useRouter();
  const { user, isLoading, setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && user && ALLOWED_ROLES.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || pending) return;

    setPending(true);
    setError('');
    setStep('Authentification Firebase…');

    try {
      // 1. Firebase
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const fbUser = credential.user;
      console.log('[login] Firebase OK, uid:', fbUser.uid);

      // 2. Token
      const token = await fbUser.getIdToken();
      setStep('Connexion au serveur…');
      console.log('[login] Token obtenu, API_URL:', API_URL);

      // 3. Sync backend avec retries + timeouts
      const wakeTimer = setTimeout(() => setStep('Le serveur se réveille (30-50s)…'), 4000);
      let syncedUser: User;
      try {
        syncedUser = await syncUser(token, fbUser.email, fbUser.displayName, fbUser.photoURL);
      } finally {
        clearTimeout(wakeTimer);
      }
      console.log('[login] Sync OK, role:', syncedUser.role);

      // 4. Role check
      if (!ALLOWED_ROLES.includes(syncedUser.role)) {
        await signOut(getFirebaseAuth());
        setError(`Accès refusé — rôle "${syncedUser.role}" non autorisé. Contactez l'administrateur.`);
        setPending(false);
        setStep('');
        return;
      }

      // 5. Store + redirect
      setToken(token);
      setUser(syncedUser);
      document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
      setStep('Redirection…');
      router.replace('/dashboard');

    } catch (err: unknown) {
      setPending(false);
      setStep('');
      const code = (err as { code?: string }).code ?? '';
      const msg  = (err as Error).message ?? '';
      console.error('[login] Erreur:', code || msg, err);

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect.');
      } else if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez dans quelques minutes.');
      } else if (code === 'auth/network-request-failed') {
        setError('Pas de connexion réseau.');
      } else if (code.startsWith('auth/')) {
        setError(`Erreur Firebase: ${code}`);
      } else {
        setError(msg || 'Connexion impossible. Vérifiez la console pour le détail.');
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500 mb-4 shadow-lg shadow-primary-500/20">
          <span className="text-white text-2xl font-bold">L</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Lilia Admin</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Connectez-vous à votre espace</p>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@liliafood.com"
              required
              autoComplete="email"
              disabled={pending}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={pending}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-dark-border bg-zinc-50 dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Erreur visible directement dans le formulaire */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !email || !password}
            className="btn-tap w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending ? (step || 'Connexion…') : 'Se connecter'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-zinc-400 mt-6">Réservé aux administrateurs et restaurateurs</p>
    </div>
  );
}
