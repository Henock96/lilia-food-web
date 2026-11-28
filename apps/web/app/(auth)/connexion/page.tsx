'use client';

import { Suspense, useState } from 'react';
import { AuthFormLayout } from '@/components/auth-form-layout';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Eye, EyeOff, Mail, Lock, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { googleAuthFailureMessage } from '@/lib/auth-errors';
import { getBrowserSession, useAuthenticationGuard, useSessionGuard } from '@/lib/auth-session';
import { sanitizeRedirect } from '@/lib/sanitize-redirect';
import { destinationAfterAuth } from '@/lib/post-auth-destination';
import { readGuestCart } from '@/lib/guest-cart';
import { useDialogFocus } from '@/lib/dialog-focus';
import { toast } from 'sonner';

function ConnexionForm() {
  const authenticationCurrent = useAuthenticationGuard();
  const sessionCurrent = useSessionGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const resetDialogRef = useDialogFocus<HTMLDivElement>(showReset, () => setShowReset(false));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const destination = destinationAfterAuth(redirect, readGuestCart().length);
    let ticket: number | undefined;
    try {
      ticket = await getBrowserSession().beginAuthentication();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!authenticationCurrent(ticket, cred.user)) return;
      await getBrowserSession().completeAuthentication(ticket, cred.user);
      if (!authenticationCurrent(ticket, cred.user)) return;
      toast.success('Connexion réussie !');
      router.push(destination);
    } catch (err: unknown) {
      if (ticket !== undefined && !authenticationCurrent(ticket)) return;
      const code = (err as { code?: string }).code;
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error('Erreur de connexion. Réessayez.');
      }
    } finally {
      if (ticket !== undefined) await getBrowserSession().cancelAuthentication(ticket);
      if (ticket === undefined || authenticationCurrent(ticket)) setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const destination = destinationAfterAuth(redirect, readGuestCart().length);
    let ticket: number | undefined;
    try {
      ticket = await getBrowserSession().beginAuthentication();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (!authenticationCurrent(ticket, cred.user)) return;
      await getBrowserSession().completeAuthentication(ticket, cred.user);
      if (!authenticationCurrent(ticket, cred.user)) return;
      toast.success('Connexion réussie !');
      router.push(destination);
    } catch (err: unknown) {
      if (ticket !== undefined && !authenticationCurrent(ticket)) return;
      const message = googleAuthFailureMessage(err, 'Connexion Google échouée');
      if (message) toast.error(message);
    } finally {
      if (ticket !== undefined) await getBrowserSession().cancelAuthentication(ticket);
      if (ticket === undefined || authenticationCurrent(ticket)) setGoogleLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      if (!sessionCurrent()) return;
      toast.success('Email de réinitialisation envoyé !');
      setShowReset(false);
      setResetEmail('');
    } catch (err: unknown) {
      if (!sessionCurrent()) return;
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') {
        toast.error('Aucun compte associé à cet email');
      } else {
        toast.error("Erreur lors de l'envoi. Réessayez.");
      }
    } finally {
      if (sessionCurrent()) setResetLoading(false);
    }
  }

  return (
    <div className="border-ink-100 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
      <header className="mb-6">
        <h1 className="font-display text-ink-900 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Connexion
        </h1>
        <p className="text-ink-500 mt-2 text-sm">
          {redirect && sanitizeRedirect(redirect) === '/panier'
            ? 'Connectez-vous pour retrouver votre panier et finaliser votre commande.'
            : 'Connectez-vous à votre compte Lilia Food.'}
        </p>
      </header>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="border-ink-100 text-ink-900 hover:border-tomato-200 hover:bg-tomato-50 mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="bg-ink-100 h-px flex-1" />
        <span className="text-ink-500 text-xs">ou</span>
        <div className="bg-ink-100 h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="text-ink-900 mb-1.5 block text-sm font-semibold">
            Adresse e-mail
          </label>
          <div className="relative">
            <Mail className="text-ink-500 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              id="login-email"
              name="email"
              autoComplete="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-4 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3">
            <label htmlFor="login-password" className="text-ink-900 text-sm font-semibold">
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setShowReset(true);
              }}
              className="text-tomato-700 text-sm font-medium hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Lock className="text-ink-500 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              id="login-password"
              name="password"
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-12 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="text-ink-500 hover:text-ink-900 absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading || !email || !password}
          className="bg-tomato-600 hover:bg-tomato-700 mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Connexion en cours…' : 'Se connecter'}
        </button>
      </form>

      <p className="border-ink-100 text-ink-500 mt-6 border-t pt-5 text-center text-sm">
        Pas encore de compte ?{' '}
        {/* Seule une destination explicite suit : le repli `/restaurants`
            transmis ici masquerait le retour au panier après l'inscription. */}
        <Link
          href={
            redirect
              ? `/inscription?redirect=${encodeURIComponent(sanitizeRedirect(redirect))}`
              : '/inscription'
          }
          className="text-tomato-700 font-medium hover:underline"
        >
          S&apos;inscrire
        </Link>
      </p>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowReset(false)}
          />
          <div
            ref={resetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-heading"
            className="border-ink-100 relative w-full max-w-sm rounded-2xl border bg-white p-5 shadow-lg sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="reset-heading" className="font-display text-ink-900 text-xl font-extrabold">
                Réinitialiser le mot de passe
              </h2>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                aria-label="Fermer"
                className="text-ink-500 hover:text-ink-900 grid size-11 shrink-0 place-items-center rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-ink-500 mb-4 text-sm">
              Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de
              passe.
            </p>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              <label htmlFor="reset-email" className="text-ink-900 text-sm font-semibold">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="text-ink-500 absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  id="reset-email"
                  autoComplete="email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  data-autofocus
                  className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-4 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="border-cream-300 text-ink-700 hover:bg-cream-100 min-h-11 flex-1 rounded-full border px-3 text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="bg-tomato-600 hover:bg-tomato-700 min-h-11 flex-1 rounded-full px-3 text-sm font-medium text-white transition-colors disabled:opacity-60"
                >
                  {resetLoading ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <AuthFormLayout>
      <Suspense
        fallback={
          <div
            className="border-ink-100 rounded-2xl border bg-white p-5 shadow-sm sm:p-8"
            role="status"
          >
            <span className="sr-only">Chargement du formulaire…</span>
            <div className="skeleton mb-5 h-9 w-40" />
            <div className="skeleton mb-4 h-12 w-full rounded-full" />
            <div className="skeleton mb-4 h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        }
      >
        <ConnexionForm />
      </Suspense>
    </AuthFormLayout>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
