'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthFormLayout } from '@/components/auth-form-layout';
import { sanitizeRedirect } from '@/lib/sanitize-redirect';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Eye, EyeOff, Mail, Lock, User, Phone, Camera, X, Gift } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { EMAIL_ALREADY_REGISTERED, googleAuthFailureMessage } from '@/lib/auth-errors';
import { getBrowserSession, useAuthenticationGuard } from '@/lib/auth-session';
import { destinationAfterAuth } from '@/lib/post-auth-destination';
import { readGuestCart } from '@/lib/guest-cart';
import { apiClient, type AuthCredential } from '@lilia/api-client';
import { uploadToCloudinary } from '@/components/auth-provider';
import { toast } from 'sonner';

async function updateDbProfile(token: AuthCredential, imageUrl: string): Promise<void> {
  await apiClient('/users/me', {
    method: 'PUT',
    token,
    body: JSON.stringify({ imageUrl }),
  });
}

/**
 * Un visiteur qui crée son compte avec un panier revient sur `/panier`, comme
 * à la connexion. Lu avant l'authentification, qui vide le panier invité, et
 * dans `window.location` : `useSearchParams` imposerait une frontière
 * `Suspense` à toute la page pour une valeur lue une seule fois.
 */
function destinationAfterSignup(): string {
  return destinationAfterAuth(
    new URLSearchParams(window.location.search).get('redirect'),
    readGuestCart().length,
  );
}

type Step = 'idle' | 'account' | 'sync' | 'photo' | 'done';

const STEP_LABELS: Record<Step, string | null> = {
  idle: null,
  account: 'Création du compte…',
  sync: 'Enregistrement…',
  photo: 'Upload de la photo…',
  done: 'Finalisation…',
};

export default function InscriptionPage() {
  const authenticationCurrent = useAuthenticationGuard();
  const router = useRouter();
  const redirect = useSearchParams().get('redirect');
  const fileRef = useRef<HTMLInputElement>(null);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<Step>('idle');

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5 Mo)');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function removeAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prenom || !nom || !email || !password) return;
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const destination = destinationAfterSignup();
    let ticket: number | undefined;
    try {
      ticket = await getBrowserSession().beginAuthentication();
      // ── Étape 1 : créer le compte Firebase ────────────────────────────────
      setStep('account');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (!authenticationCurrent(ticket, user)) return;

      // Mettre à jour le displayName immédiatement
      await updateProfile(user, { displayName: `${prenom} ${nom}` });
      if (!authenticationCurrent(ticket, user)) return;

      // ── Étape 2 : sync en DB (priorité absolue) ───────────────────────────
      // Le contrôleur est l'unique synchroniseur et writer du cookie.
      setStep('sync');
      await getBrowserSession().completeAuthentication(ticket, user, {
        telephone,
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      });
      if (!authenticationCurrent(ticket, user)) return;
      const token = getBrowserSession().getCredential();
      if (!token) return;

      // ── Étape 3 : upload photo (vraiment non-bloquant) ────────────────────
      if (avatarFile) {
        setStep('photo');
        try {
          const imageUrl = await uploadToCloudinary(avatarFile, token, 'users');
          if (!authenticationCurrent(ticket, user)) return;
          // Met à jour Firebase et la DB avec la photo
          await Promise.all([
            updateProfile(user, { photoURL: imageUrl }),
            updateDbProfile(token, imageUrl),
          ]);
          if (!authenticationCurrent(ticket, user)) return;
        } catch (err) {
          if (!authenticationCurrent(ticket, user)) return;
          const msg = err instanceof Error ? err.message : '';
          toast.error(
            `Photo non uploadée (${msg || 'erreur réseau'}). Vous pourrez la changer dans votre profil.`,
            { duration: 5000 },
          );
        }
      }

      // ── Étape 4 : redirection (toujours atteinte) ─────────────────────────
      setStep('done');
      toast.success('Compte créé avec succès ! Bienvenue 🎉');
      router.push(destination);
    } catch (err: unknown) {
      if (ticket !== undefined && !authenticationCurrent(ticket)) return;
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        toast.error(EMAIL_ALREADY_REGISTERED);
      } else if (code === 'auth/weak-password') {
        toast.error('Mot de passe trop faible (min. 6 caractères)');
      } else if (code === 'auth/network-request-failed') {
        toast.error('Erreur réseau. Vérifiez votre connexion.');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
    } finally {
      if (ticket !== undefined) await getBrowserSession().cancelAuthentication(ticket);
      if (ticket === undefined || authenticationCurrent(ticket)) {
        setLoading(false);
        setStep('idle');
      }
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const destination = destinationAfterSignup();
    let ticket: number | undefined;
    try {
      ticket = await getBrowserSession().beginAuthentication();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (!authenticationCurrent(ticket, cred.user)) return;

      // Le code saisi sur CET écran doit suivre, quel que soit le mode
      // d'inscription choisi ensuite. Sans cet appel, un filleul qui tape son
      // code puis clique « Google » perdait son parrain sans le savoir : la
      // synchronisation d'`auth-provider` ne transmet jamais de code.
      //
      // Le serveur ignore le code sur un compte déjà existant — rejouer cet
      // appel sur une connexion est donc sans effet, et c'est voulu : le
      // parrain ne se change pas après coup.
      const code = referralCode.trim().toUpperCase();
      await getBrowserSession().completeAuthentication(
        ticket,
        cred.user,
        code ? { referralCode: code } : undefined,
      );
      if (!authenticationCurrent(ticket, cred.user)) return;

      toast.success('Bienvenue sur Lilia Food 🎉');
      router.push(destination);
    } catch (err: unknown) {
      if (ticket !== undefined && !authenticationCurrent(ticket)) return;
      const message = googleAuthFailureMessage(err, 'Inscription Google échouée');
      if (message) toast.error(message);
    } finally {
      if (ticket !== undefined) await getBrowserSession().cancelAuthentication(ticket);
      if (ticket === undefined || authenticationCurrent(ticket)) setGoogleLoading(false);
    }
  }

  const stepLabel = STEP_LABELS[step];
  const isDisabled = loading || googleLoading || !prenom || !nom || !email || !password;

  return (
    <AuthFormLayout>
      <div className="border-ink-100 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <header className="mb-6">
          <h1 className="font-display text-ink-900 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Créer un compte
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            {redirect && sanitizeRedirect(redirect) === '/panier'
              ? 'Créez un compte pour retrouver votre panier et finaliser votre commande.'
              : 'Rejoignez Lilia Food pour commander vos repas.'}
          </p>
        </header>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="border-ink-100 text-ink-900 hover:border-tomato-200 hover:bg-tomato-50 mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="bg-ink-100 h-px flex-1" />
          <span className="text-ink-500 text-xs">ou</span>
          <div className="bg-ink-100 h-px flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── Avatar picker ── */}
          <div className="mb-1 flex justify-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Choisir une photo de profil"
                className="border-ink-300 bg-cream-100 hover:border-tomato-500 group flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors"
              >
                {avatarPreview ? (
                  // Aperçu local (blob: via createObjectURL) — non optimisable par next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Aperçu" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-ink-500 group-hover:text-tomato-700 flex flex-col items-center gap-1 transition-colors">
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Photo</span>
                  </div>
                )}
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  aria-label="Retirer la photo"
                  className="bg-ink-900 absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white transition-colors hover:bg-rose-600 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* ── Prénom + Nom ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="signup-prenom"
                className="text-ink-900 mb-1.5 block text-sm font-semibold"
              >
                Prénom
              </label>
              <div className="relative">
                <User className="text-ink-500 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Jean"
                  required
                  id="signup-prenom"
                  autoComplete="given-name"
                  className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-3 pl-9 text-base transition-all focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="signup-nom"
                className="text-ink-900 mb-1.5 block text-sm font-semibold"
              >
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                required
                id="signup-nom"
                autoComplete="family-name"
                className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white px-3 py-3 text-base transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Téléphone ── */}
          <div>
            <label
              htmlFor="signup-telephone"
              className="text-ink-900 mb-1.5 block text-sm font-semibold"
            >
              Téléphone <span className="text-ink-500 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Phone className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+242 06 000 0000"
                id="signup-telephone"
                autoComplete="tel"
                className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-4 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Email ── */}
          <div>
            <label
              htmlFor="signup-email"
              className="text-ink-900 mb-1.5 block text-sm font-semibold"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                id="signup-email"
                autoComplete="email"
                className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-4 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Mot de passe ── */}
          <div>
            <label
              htmlFor="signup-password"
              className="text-ink-900 mb-1.5 block text-sm font-semibold"
            >
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                required
                minLength={6}
                id="signup-password"
                autoComplete="new-password"
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

          {/* ── Code de parrainage ── */}
          <div>
            <label
              htmlFor="signup-referral"
              className="text-ink-900 mb-1.5 block text-sm font-semibold"
            >
              Code de parrainage <span className="text-ink-500 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Gift className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC12345"
                maxLength={12}
                id="signup-referral"
                autoComplete="off"
                className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white py-3 pr-4 pl-10 text-base transition-all focus:ring-2 focus:outline-none"
              />
            </div>
            {referralCode && (
              <p className="text-success mt-1 flex items-center gap-1 text-xs">
                <Gift className="h-3 w-3" /> +200 points offerts à l&apos;activation
              </p>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isDisabled}
            className="bg-tomato-600 hover:bg-tomato-700 mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {stepLabel ?? 'Création en cours…'}
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Créer mon compte
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>

        <p className="border-ink-100 text-ink-500 mt-6 border-t pt-5 text-center text-sm">
          Déjà un compte ?{' '}
          <Link
            href={
              redirect
                ? `/connexion?redirect=${encodeURIComponent(sanitizeRedirect(redirect))}`
                : '/connexion'
            }
            className="text-tomato-700 font-medium hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
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
