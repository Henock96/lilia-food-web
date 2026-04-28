'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Camera, X, Gift } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { pageVariants } from '@lilia/motion';
import { API_URL } from '@lilia/api-client';
import { uploadToCloudinary } from '@/components/auth-provider';
import { toast } from 'sonner';

async function syncUser(token: string, telephone: string, referralCode?: string): Promise<void> {
  const res = await fetch(`${API_URL}/users/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ telephone, ...(referralCode ? { referralCode } : {}) }),
  });
  if (!res.ok) throw new Error(`Sync échoué (${res.status})`);
}

async function updateDbProfile(token: string, imageUrl: string): Promise<void> {
  await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl }),
  });
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
  const router = useRouter();
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
    try {
      // ── Étape 1 : créer le compte Firebase ────────────────────────────────
      setStep('account');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Mettre à jour le displayName immédiatement
      await updateProfile(user, { displayName: `${prenom} ${nom}` });

      // Token avec le displayName mis à jour
      const token = await user.getIdToken(true);

      // ── Étape 2 : sync en DB (priorité absolue) ───────────────────────────
      // On essaie de créer le user en DB avec téléphone et nom.
      // Si ça échoue, l'onAuthStateChanged dans auth-provider retentera.
      setStep('sync');
      try {
        await syncUser(token, telephone, referralCode.trim().toUpperCase() || undefined);
      } catch {
        // Non-bloquant : auth-provider retentera via onAuthStateChanged
      }

      // ── Étape 3 : upload photo (vraiment non-bloquant) ────────────────────
      if (avatarFile) {
        setStep('photo');
        try {
          const imageUrl = await uploadToCloudinary(avatarFile, token, 'users');
          // Met à jour Firebase et la DB avec la photo
          await Promise.all([
            updateProfile(user, { photoURL: imageUrl }),
            updateDbProfile(token, imageUrl),
          ]);
        } catch (err) {
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
      router.push('/restaurants');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        toast.error('Cet email est déjà utilisé');
      } else if (code === 'auth/weak-password') {
        toast.error('Mot de passe trop faible (min. 6 caractères)');
      } else if (code === 'auth/network-request-failed') {
        toast.error('Erreur réseau. Vérifiez votre connexion.');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
    } finally {
      setLoading(false);
      setStep('idle');
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Bienvenue sur Lilia Food 🎉');
      router.push('/restaurants');
    } catch {
      toast.error('Inscription Google échouée');
    } finally {
      setGoogleLoading(false);
    }
  }

  const stepLabel = STEP_LABELS[step];
  const isDisabled = loading || !prenom || !nom || !email || !password;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="w-full max-w-sm"
    >
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-zinc-100 dark:border-dark-border p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Créer un compte 🍽️
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Rejoignez Lilia Food et commandez dès maintenant
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-dark-surface border border-zinc-200 dark:border-dark-border rounded-2xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-card hover:border-zinc-300 dark:hover:border-zinc-600 transition-all mb-5 disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-dark-border" />
          <span className="text-xs text-zinc-400">ou</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-dark-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── Avatar picker ── */}
          <div className="flex justify-center mb-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Choisir une photo de profil"
                className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-300 dark:border-dark-border bg-zinc-50 dark:bg-dark-surface flex items-center justify-center overflow-hidden hover:border-primary-400 dark:hover:border-primary-500 transition-colors group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-400 group-hover:text-primary-500 transition-colors">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Photo</span>
                  </div>
                )}
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  aria-label="Retirer la photo"
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Prénom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Jean"
                  required
                  autoComplete="given-name"
                  className="w-full pl-9 pr-3 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                required
                autoComplete="family-name"
                className="w-full px-3 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
          </div>

          {/* ── Téléphone ── */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Téléphone{' '}
              <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+242 06 000 0000"
                autoComplete="tel"
                className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
          </div>

          {/* ── Email ── */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
          </div>

          {/* ── Mot de passe ── */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Code de parrainage ── */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Code de parrainage{' '}
              <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC12345"
                maxLength={12}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
            {referralCode && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <Gift className="w-3 h-3" /> +200 points offerts à l&apos;activation
              </p>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isDisabled}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all shadow-sm shadow-primary-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
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
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
