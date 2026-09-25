'use client';

import { useState } from 'react';
import type { MultiFactorError, TotpSecret } from 'firebase/auth';
import QRCode from 'qrcode';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { getFirebaseAuth } from '@/lib/firebase';
import {
  finishTotpEnrollment,
  hasTotp,
  isMfaChallenge,
  isTotpCode,
  mfaErrorMessage,
  reauthenticate,
  resolveWithTotp,
  startTotpEnrollment,
} from '@/lib/mfa';

type Step = 'idle' | 'password' | 'challenge' | 'scan';

/**
 * Double authentification de l'administrateur (F3-08, phase 2).
 *
 * 1. mot de passe (Firebase exige une connexion récente pour créer un secret) ;
 * 2. QR code à scanner dans Google Authenticator / Microsoft Authenticator —
 *    généré DANS le navigateur : le secret ne quitte jamais la page ;
 * 3. code affiché par l'application, qui prouve l'enregistrement.
 */
export function MfaEnrollmentCard() {
  // Lu une fois, côté navigateur : la session Firebase n'existe pas au rendu
  // serveur.
  const [enrolled, setEnrolled] = useState(
    () => typeof window !== 'undefined' && hasTotp(getFirebaseAuth().currentUser),
  );
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<MultiFactorError | null>(null);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const [qr, setQr] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function beginScan() {
    const started = await startTotpEnrollment();
    setSecret(started.secret);
    setSecretKey(started.secretKey);
    setQr(await QRCode.toDataURL(started.otpauthUri, { margin: 1, width: 200 }));
    setStep('scan');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      if (step === 'password') {
        await reauthenticate(password);
        setPassword('');
        await beginScan();
      } else if (step === 'challenge' && challenge) {
        await resolveWithTotp(challenge, code);
        setCode('');
        await beginScan();
      } else if (step === 'scan' && secret) {
        await finishTotpEnrollment(secret, code);
        setEnrolled(true);
        setStep('idle');
        setSecret(null);
        setQr('');
        setCode('');
        toast.success('Double authentification activée.');
      }
    } catch (err) {
      if (isMfaChallenge(err)) {
        setChallenge(err);
        setStep('challenge');
      } else {
        setError(mfaErrorMessage(err));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card dark:border-dark-border dark:bg-dark-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck size={16} /> Double authentification
      </h2>
      {enrolled && step === 'idle' ? (
        <p className="mt-2 text-sm text-emerald-600" data-testid="mfa-enrolled">
          Activée : un code de votre application vous est demandé à la connexion
          et avant chaque geste financier.
        </p>
      ) : step === 'idle' ? (
        <>
          <p className="mt-2 text-sm text-zinc-500">
            Protège les gestes qui font partir de l’argent : même avec votre mot de
            passe, personne ne peut les faire sans le code de votre téléphone.
          </p>
          <button
            type="button"
            onClick={() => setStep('password')}
            className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-dark-border"
          >
            <KeyRound size={15} /> Activer
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          {step === 'password' && (
            <>
              <p className="text-sm text-zinc-500">Confirmez votre mot de passe.</p>
              <input
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Mot de passe"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-dark-border dark:bg-dark-surface"
              />
            </>
          )}
          {(step === 'challenge' || step === 'scan') && (
            <>
              {step === 'scan' && (
                <div className="space-y-2 text-sm text-zinc-500">
                  <p>
                    Scannez ce code avec Google Authenticator ou Microsoft
                    Authenticator, puis saisissez le code à 6 chiffres affiché.
                  </p>
                  {qr && (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL générée localement
                    <img src={qr} alt="QR code à scanner" width={200} height={200} className="rounded-lg" />
                  )}
                  <p className="break-all text-xs">
                    Sans appareil photo, saisissez cette clé : <code>{secretKey}</code>
                  </p>
                </div>
              )}
              {step === 'challenge' && (
                <p className="text-sm text-zinc-500">
                  Code de votre application d’authentification actuelle :
                </p>
              )}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-label="Code à 6 chiffres"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-center text-xl tracking-[0.5em] dark:border-dark-border dark:bg-dark-surface"
              />
            </>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('idle');
                setError('');
              }}
              className="px-3 py-1.5 text-sm text-zinc-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending || (step === 'password' ? !password : !isTotpCode(code))}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              {step === 'scan' ? 'Activer' : 'Continuer'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
