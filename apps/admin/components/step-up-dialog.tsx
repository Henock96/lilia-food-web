'use client';

import { useState } from 'react';
import type { MultiFactorError } from 'firebase/auth';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  isMfaChallenge,
  isTotpCode,
  mfaErrorMessage,
  reauthenticate,
  resolveWithTotp,
} from '@/lib/mfa';
import { useStepUpStore } from '@/store/step-up';

/**
 * Confirmation d'identité avant un geste financier (F3-08, R-08.2).
 *
 * Le serveur exige une authentification de moins de 15 min pour faire partir
 * de l'argent. Mot de passe, puis code de l'application : le nouveau jeton
 * (`auth_time` frais) remplace l'ancien via `onIdTokenChanged`, et
 * l'administrateur relance son geste.
 */
export function StepUpDialog() {
  const { open, close } = useStepUpStore();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<MultiFactorError | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function reset() {
    setPassword('');
    setCode('');
    setChallenge(null);
    setError('');
    close();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      if (challenge) {
        await resolveWithTotp(challenge, code);
      } else {
        await reauthenticate(password);
      }
      toast.success('Identité confirmée. Relancez votre action.');
      reset();
    } catch (err) {
      if (isMfaChallenge(err)) {
        setChallenge(err);
      } else {
        setError(mfaErrorMessage(err));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-card"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck size={18} /> Confirmez votre identité
        </h2>
        <p className="text-sm text-zinc-500">
          {challenge
            ? 'Saisissez le code à 6 chiffres de votre application d’authentification.'
            : 'Ce geste fait partir de l’argent : confirmez votre mot de passe (valable 15 minutes).'}
        </p>
        {challenge ? (
          <input
            key="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label="Code de l’application d’authentification"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-center text-xl tracking-[0.5em] dark:border-dark-border dark:bg-dark-surface"
          />
        ) : (
          <input
            key="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Mot de passe"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-dark-border dark:bg-dark-surface"
          />
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={reset} className="px-3 py-1.5 text-sm text-zinc-600">
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending || (challenge ? !isTotpCode(code) : !password)}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Confirmer
          </button>
        </div>
      </form>
    </div>
  );
}
