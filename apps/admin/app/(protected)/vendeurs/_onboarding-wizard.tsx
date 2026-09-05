'use client';

import { useMemo, useState } from 'react';
import {
  useVendorOnboarding,
  useUpdateVendorIdentity,
  useUpdateVendorLocation,
  useUpdateVendorHours,
  useUpdateVendorDelivery,
  useUpdateVendorCommerce,
  useUpdateVendorPayoutAccount,
  useActivateVendorOnboarding,
  useVendorPreview,
  useQuartiers,
  useProducts,
} from '@lilia/api-client';
import type {
  OnboardingReport,
  PayoutProvider,
  ReadinessCheck,
  Restaurant,
} from '@lilia/types';
import {
  ONBOARDING_STEPS as STEPS,
  canLeaveStep,
  stepState as computeStepState,
  type OnboardingStep,
  type StepId,
} from '@/lib/onboarding-steps';
import { useAuthStore } from '@/store/auth';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';
import { toast } from 'sonner';
import { ApiError } from '@lilia/api-client';
import {
  Check,
  AlertTriangle,
  Circle,
  X,
  Loader2,
  ExternalLink,
  Wallet,
} from 'lucide-react';

const DAYS = [
  { key: 'LUNDI', label: 'Lundi' },
  { key: 'MARDI', label: 'Mardi' },
  { key: 'MERCREDI', label: 'Mercredi' },
  { key: 'JEUDI', label: 'Jeudi' },
  { key: 'VENDREDI', label: 'Vendredi' },
  { key: 'SAMEDI', label: 'Samedi' },
  { key: 'DIMANCHE', label: 'Dimanche' },
];



interface Props {
  vendor: Restaurant;
  onClose: () => void;
}

export function OnboardingWizard({ vendor, onClose }: Props) {
  const { token } = useAuthStore();
  const [step, setStep] = useState<StepId>('identity');

  const { data: report, isLoading } = useVendorOnboarding(token, vendor.id);

  // Le statut de chaque case vient du serveur, et les deux règles qui s'en
  // déduisent — pastille d'état, droit d'avancer — vivent dans
  // `lib/onboarding-steps`, pures et testées. L'interface n'en calcule aucune :
  // elle affiche ce que le backend accepte ou refuse d'activer.
  const canLeave = (s: OnboardingStep) => canLeaveStep(s, report);
  const stepState = (s: OnboardingStep) => computeStepState(s, report);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-3xl h-full overflow-y-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
        <Header vendor={vendor} report={report} onClose={onClose} />

        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex">
            <StepNav
              current={step}
              onSelect={setStep}
              stateOf={stepState}
            />
            <div className="flex-1 p-6 min-w-0">
              <StepBody
                step={step}
                vendor={vendor}
                report={report}
                token={token}
                onDone={(next) => {
                  const current = STEPS.find((s) => s.id === step);
                  if (next && current && canLeave(current)) setStep(next);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── En-tête : progression + activation ──────────────────────────────────────

function Header({
  vendor,
  report,
  onClose,
}: {
  vendor: Restaurant;
  report?: OnboardingReport;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const activate = useActivateVendorOnboarding(token, vendor.id);
  const [confirmRecommendations, setConfirmRecommendations] = useState(false);

  const isActivated = report?.onboardingStatus === 'ACTIVATED';

  function handleActivate(skipRecommendations = false) {
    activate.mutate(
      { skipRecommendations },
      {
        onSuccess: () => {
          toast.success(`${vendor.nom} est activé.`);
          setConfirmRecommendations(false);
        },
        onError: (err) => {
          // Le 409 « recommandations manquantes » est une demande de
          // confirmation, pas un échec : on propose de passer outre plutôt que
          // d'afficher une erreur rouge sur une situation normale.
          if (err instanceof ApiError && err.status === 409 && !skipRecommendations) {
            setConfirmRecommendations(true);
            return;
          }
          toast.error(err instanceof Error ? err.message : "Activation impossible");
        },
      },
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {vendor.nom}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isActivated
              ? 'Boutique activée'
              : report?.isReady
                ? 'Prête à activer'
                : 'Configuration en cours'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full transition-all ${report?.isReady ? 'bg-emerald-500' : 'bg-primary-500'}`}
            style={{ width: `${report?.progress ?? 0}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-zinc-500 w-10 text-right">
          {report?.progress ?? 0}%
        </span>
      </div>

      {!isActivated && (
        <div className="space-y-2">
          <button
            onClick={() => handleActivate(confirmRecommendations)}
            disabled={!report?.isReady || activate.isPending}
            className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {activate.isPending
              ? 'Activation…'
              : confirmRecommendations
                ? 'Activer malgré les éléments recommandés manquants'
                : 'Activer la boutique'}
          </button>
          {!report?.isReady && report && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {report.blockingIssues.length} élément(s) à compléter avant activation.
            </p>
          )}
        </div>
      )}

      {isActivated && (
        <p className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
          <Check size={14} /> Visible par les clients
          {vendor.adminApproved === false && ' — en attente de validation marketplace'}
        </p>
      )}
    </div>
  );
}

// ─── Navigation latérale ─────────────────────────────────────────────────────

function StepNav({
  current,
  onSelect,
  stateOf,
}: {
  current: StepId;
  onSelect: (s: StepId) => void;
  stateOf: (s: OnboardingStep) => 'ok' | 'warning' | 'blocking' | 'neutral';
}) {
  return (
    <nav className="w-52 shrink-0 border-r border-zinc-200 dark:border-zinc-800 py-4">
      {STEPS.map((s, i) => {
        const state = stateOf(s);
        const active = current === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
              active
                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <StepIcon state={state} />
            <span className="truncate">
              <span className="text-zinc-400 mr-1.5 tabular-nums">{i + 1}</span>
              {s.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StepIcon({ state }: { state: 'ok' | 'warning' | 'blocking' | 'neutral' }) {
  if (state === 'ok') return <Check size={15} className="text-emerald-500 shrink-0" />;
  if (state === 'blocking')
    return <Circle size={15} className="text-zinc-300 dark:text-zinc-600 shrink-0" />;
  if (state === 'warning')
    return <AlertTriangle size={15} className="text-amber-500 shrink-0" />;
  return <Circle size={15} className="text-zinc-300 dark:text-zinc-600 shrink-0" />;
}

// ─── Corps des étapes ────────────────────────────────────────────────────────

function StepBody({
  step,
  vendor,
  report,
  token,
  onDone,
}: {
  step: StepId;
  vendor: Restaurant;
  report?: OnboardingReport;
  token: string | null;
  onDone: (next?: StepId) => void;
}) {
  switch (step) {
    case 'identity':
      return <IdentityStep vendor={vendor} token={token} onDone={() => onDone('visuals')} />;
    case 'visuals':
      return <VisualsStep vendor={vendor} token={token} onDone={() => onDone('location')} />;
    case 'location':
      return <LocationStep vendor={vendor} token={token} onDone={() => onDone('hours')} />;
    case 'hours':
      return <HoursStep vendor={vendor} token={token} onDone={() => onDone('delivery')} />;
    case 'delivery':
      return <DeliveryStep vendor={vendor} token={token} onDone={() => onDone('commerce')} />;
    case 'commerce':
      return (
        <CommerceStep
          vendor={vendor}
          token={token}
          payoutCheck={report?.checks.find((c) => c.key === 'payout')}
          onDone={() => onDone('catalog')}
        />
      );
    case 'catalog':
      return (
        <CatalogStep
          vendor={vendor}
          token={token}
          check={report?.checks.find((c) => c.key === 'catalog')}
        />
      );
    case 'review':
      return <ReviewStep vendor={vendor} token={token} report={report} />;
  }
}

// ─── Étape 2 — identité ──────────────────────────────────────────────────────

function IdentityStep({
  vendor,
  token,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  onDone: () => void;
}) {
  const [nom, setNom] = useState(vendor.nom);
  const [description, setDescription] = useState(vendor.description ?? '');
  const [phone, setPhone] = useState(vendor.phone);
  const [email, setEmail] = useState(vendor.email ?? '');
  const mutation = useUpdateVendorIdentity(token, vendor.id);

  return (
    <StepShell
      title="Identité de la boutique"
      hint="Ce que le client lit en premier sur la fiche."
      onSave={() =>
        mutation.mutate(
          { nom, description, phone, email: email || undefined },
          {
            onSuccess: () => { toast.success('Identité enregistrée'); onDone(); },
            onError: (e) => toast.error(errText(e)),
          },
        )
      }
      saving={mutation.isPending}
    >
      <Field label="Nom commercial *">
        <Input value={nom} onChange={setNom} />
      </Field>
      <Field
        label="Description"
        hint="Recommandé : sans elle, le client ne sait pas ce que vous vendez."
      >
        <TextArea value={description} onChange={setDescription} rows={3} />
      </Field>
      <Field label="Téléphone du commerce *">
        <Input value={phone} onChange={setPhone} placeholder="060000000" />
      </Field>
      <Field label="E-mail de contact" hint="Distinct de celui du compte propriétaire.">
        <Input value={email} onChange={setEmail} type="email" />
      </Field>
    </StepShell>
  );
}

// ─── Étape 3 — visuels ───────────────────────────────────────────────────────

function VisualsStep({
  vendor,
  token,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  onDone: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(vendor.imageUrl ?? '');
  const [publicId, setPublicId] = useState(vendor.imagePublicId ?? '');
  const [uploading, setUploading] = useState(false);
  const mutation = useUpdateVendorIdentity(token, vendor.id);

  async function handleFile(file: File) {
    if (!token) return;
    setUploading(true);
    try {
      // Passe par `POST /upload/image` : taille, type MIME et dossier sont
      // vérifiés côté serveur, là où le client ne peut pas les contourner.
      const res = await uploadToCloudinary(file, token, 'restaurants');
      setImageUrl(res.secureUrl);
      // Le `publicId` accompagne l'URL : sans lui, remplacer le logo laisserait
      // l'ancien fichier orphelin dans Cloudinary, sans moyen de le retrouver.
      setPublicId(res.publicId);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <StepShell
      title="Logo et photos"
      hint="Le logo apparaît sur chaque carte du catalogue."
      onSave={() =>
        mutation.mutate(
          { imageUrl, imagePublicId: publicId },
          {
            onSuccess: () => { toast.success('Logo enregistré'); onDone(); },
            onError: (e) => toast.error(errText(e)),
          },
        )
      }
      saving={mutation.isPending}
    >
      <Field label="Logo *">
        <div className="flex items-start gap-4">
          <label className="shrink-0 w-32 h-32 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors overflow-hidden">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {uploading ? (
              <Loader2 className="animate-spin text-zinc-400" size={20} />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-zinc-400 text-center px-2">
                Choisir une image
              </span>
            )}
          </label>
          <p className="text-xs text-zinc-500 leading-relaxed">
            JPEG, PNG ou WebP. 5 Mo maximum.
            <br />
            L&apos;image est redimensionnée et compressée automatiquement.
          </p>
        </div>
      </Field>

      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-600 dark:text-zinc-400">
        La photo de couverture et la galerie se gèrent depuis la fiche du vendeur,
        onglet « Photos ». Elles sont recommandées mais ne bloquent pas
        l&apos;activation.
      </div>
    </StepShell>
  );
}

// ─── Étape 4 — localisation ──────────────────────────────────────────────────

function LocationStep({
  vendor,
  token,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  onDone: () => void;
}) {
  const [adresse, setAdresse] = useState(vendor.adresse);
  const [quartierId, setQuartierId] = useState(vendor.quartierId ?? '');
  const [lat, setLat] = useState(vendor.latitude?.toString() ?? '');
  const [lng, setLng] = useState(vendor.longitude?.toString() ?? '');
  const [instructions, setInstructions] = useState(vendor.deliveryInstructions ?? '');
  const { data: quartiers } = useQuartiers();
  const mutation = useUpdateVendorLocation(token, vendor.id);

  function save() {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      toast.error('Coordonnées GPS invalides');
      return;
    }
    mutation.mutate(
      {
        adresse,
        quartierId: quartierId || undefined,
        latitude: latNum,
        longitude: lngNum,
        deliveryInstructions: instructions,
      },
      {
        onSuccess: () => { toast.success('Localisation enregistrée'); onDone(); },
        onError: (e) => toast.error(errText(e)),
      },
    );
  }

  return (
    <StepShell
      title="Localisation"
      hint="Sans GPS, le délai de livraison affiché au client et le trajet du livreur sont faux."
      onSave={save}
      saving={mutation.isPending}
    >
      <Field label="Adresse *">
        <Input value={adresse} onChange={setAdresse} placeholder="Avenue, repère" />
      </Field>
      <Field label="Quartier *" hint="Sert au calcul des frais de livraison par zone.">
        <select
          value={quartierId}
          onChange={(e) => setQuartierId(e.target.value)}
          className={inputCls}
        >
          <option value="">— Choisir —</option>
          {quartiers?.map((q) => (
            <option key={q.id} value={q.id}>
              {q.nom} ({q.ville})
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude *" hint="Entre -5,5 et 3,8">
          <Input value={lat} onChange={setLat} placeholder="-4.2634" />
        </Field>
        <Field label="Longitude *" hint="Entre 10,5 et 19,0">
          <Input value={lng} onChange={setLng} placeholder="15.2429" />
        </Field>
      </div>
      <Field label="Repères pour le livreur">
        <Input
          value={instructions}
          onChange={setInstructions}
          placeholder="Portail bleu, face à la pharmacie"
        />
      </Field>
    </StepShell>
  );
}

// ─── Étape 5 — horaires ──────────────────────────────────────────────────────

interface DayState { open: string; close: string; closed: boolean }

function HoursStep({
  vendor,
  token,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  onDone: () => void;
}) {
  const initial = useMemo(() => {
    const map: Record<string, DayState> = {};
    for (const d of DAYS) {
      const found = vendor.operatingHours?.find((h) => h.dayOfWeek === d.key);
      map[d.key] = {
        open: found?.openTime ?? '08:00',
        close: found?.closeTime ?? '20:00',
        // Un jour sans ligne est fermé : c'est le défaut sûr, cohérent avec le
        // cron qui ferme désormais les vendeurs sans horaires.
        closed: found ? found.isClosed : true,
      };
    }
    return map;
  }, [vendor.operatingHours]);

  const [days, setDays] = useState(initial);
  const mutation = useUpdateVendorHours(token, vendor.id);

  const set = (key: string, patch: Partial<DayState>) =>
    setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  function applyToAll() {
    const monday = days.LUNDI;
    setDays(Object.fromEntries(DAYS.map((d) => [d.key, { ...monday }])));
  }

  return (
    <StepShell
      title="Horaires d'ouverture"
      hint="La boutique s'ouvre et se ferme automatiquement selon ces horaires. Sans aucun jour ouvert, elle reste fermée."
      onSave={() =>
        mutation.mutate(
          {
            hours: DAYS.map((d) => ({
              dayOfWeek: d.key,
              openTime: days[d.key].open,
              closeTime: days[d.key].close,
              isClosed: days[d.key].closed,
            })),
          },
          {
            onSuccess: () => { toast.success('Horaires enregistrés'); onDone(); },
            onError: (e) => toast.error(errText(e)),
          },
        )
      }
      saving={mutation.isPending}
    >
      <button
        type="button"
        onClick={applyToAll}
        className="text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
      >
        Appliquer les horaires du lundi à toute la semaine
      </button>

      <div className="space-y-2">
        {DAYS.map((d) => (
          <div key={d.key} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-32 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={!days[d.key].closed}
                onChange={(e) => set(d.key, { closed: !e.target.checked })}
                className="accent-primary-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{d.label}</span>
            </label>
            <input
              type="time"
              value={days[d.key].open}
              disabled={days[d.key].closed}
              onChange={(e) => set(d.key, { open: e.target.value })}
              className={`${inputCls} w-28 disabled:opacity-40`}
            />
            <span className="text-zinc-400 text-sm">→</span>
            <input
              type="time"
              value={days[d.key].close}
              disabled={days[d.key].closed}
              onChange={(e) => set(d.key, { close: e.target.value })}
              className={`${inputCls} w-28 disabled:opacity-40`}
            />
            {days[d.key].closed && (
              <span className="text-xs text-zinc-400">Fermé</span>
            )}
          </div>
        ))}
      </div>
    </StepShell>
  );
}

// ─── Étape 6 — livraison ─────────────────────────────────────────────────────

function DeliveryStep({
  vendor,
  token,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  onDone: () => void;
}) {
  const [delivery, setDelivery] = useState(vendor.supportsDelivery ?? true);
  const [pickup, setPickup] = useState(vendor.supportsPickup ?? true);
  const [mode, setMode] = useState(vendor.deliveryPriceMode);
  const [fee, setFee] = useState(String(vendor.fixedDeliveryFee));
  const [etaMin, setEtaMin] = useState(String(vendor.estimatedDeliveryTimeMin));
  const [etaMax, setEtaMax] = useState(String(vendor.estimatedDeliveryTimeMax));
  const mutation = useUpdateVendorDelivery(token, vendor.id);

  return (
    <StepShell
      title="Livraison et retrait"
      hint="Un vendeur doit accepter au moins l'un des deux."
      onSave={() =>
        mutation.mutate(
          {
            supportsDelivery: delivery,
            supportsPickup: pickup,
            deliveryPriceMode: mode,
            fixedDeliveryFee: Number(fee),
            estimatedDeliveryTimeMin: Number(etaMin),
            estimatedDeliveryTimeMax: Number(etaMax),
          },
          {
            onSuccess: () => { toast.success('Livraison enregistrée'); onDone(); },
            onError: (e) => toast.error(errText(e)),
          },
        )
      }
      saving={mutation.isPending}
    >
      <div className="space-y-2">
        <Toggle label="Livraison à domicile" checked={delivery} onChange={setDelivery} />
        <Toggle label="Retrait au comptoir" checked={pickup} onChange={setPickup} />
      </div>

      {delivery && (
        <>
          <Field label="Tarification">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className={inputCls}
            >
              <option value="FIXED">Prix fixe</option>
              <option value="ZONE_BASED">Par zone de livraison</option>
            </select>
          </Field>
          {mode === 'FIXED' ? (
            <Field label="Frais de livraison (XAF)">
              <Input value={fee} onChange={setFee} type="number" />
            </Field>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Définissez au moins une zone depuis l&apos;onglet « Zones » — sans
              zone, l&apos;activation sera refusée.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Délai min (min)">
              <Input value={etaMin} onChange={setEtaMin} type="number" />
            </Field>
            <Field label="Délai max (min)">
              <Input value={etaMax} onChange={setEtaMax} type="number" />
            </Field>
          </div>
        </>
      )}
    </StepShell>
  );
}

// ─── Étape 7 — commercial ────────────────────────────────────────────────────

function CommerceStep({
  vendor,
  token,
  payoutCheck,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  payoutCheck?: ReadinessCheck;
  onDone: () => void;
}) {
  const [commission, setCommission] = useState(
    vendor.commissionPercent === null || vendor.commissionPercent === undefined
      ? ''
      : String(vendor.commissionPercent),
  );
  const [minOrder, setMinOrder] = useState(String(vendor.minimumOrderAmount));
  const mutation = useUpdateVendorCommerce(token, vendor.id);

  return (
    <div className="space-y-6">
      <StepShell
      title="Paramètres commerciaux"
      hint="Réservé aux administrateurs. Le vendeur ne peut pas modifier sa commission."
      onSave={() =>
        mutation.mutate(
          {
            commissionPercent: commission.trim() === '' ? null : Number(commission),
            minimumOrderAmount: Number(minOrder),
          },
          {
            onSuccess: () => { toast.success('Paramètres enregistrés'); onDone(); },
            onError: (e) => toast.error(errText(e)),
          },
        )
      }
      saving={mutation.isPending}
    >
      <Field
        label="Commission plateforme (%)"
        hint="Vide = taux plateforme par défaut. Figée sur chaque commande au moment où elle est passée."
      >
        <Input value={commission} onChange={setCommission} type="number" placeholder="—" />
      </Field>
      <Field label="Montant minimum de commande (XAF)">
        <Input value={minOrder} onChange={setMinOrder} type="number" />
      </Field>
      </StepShell>

      <PayoutAccountForm vendor={vendor} token={token} check={payoutCheck} onDone={onDone} />
    </div>
  );
}

/**
 * Compte Mobile Money sur lequel ce vendeur sera payé.
 *
 * Formulaire distinct des paramètres commerciaux, et pas par goût de la
 * séparation : ce sont deux écritures sur deux routes, et surtout deux
 * décisions de nature différente. La commission est négociable ; ce numéro est
 * la **destination de l'argent**, réservée à l'ADMIN — un compte compromis
 * détournerait tous les reversements suivants.
 *
 * ⚠️ Aucun pré-remplissage : le serveur ne rend le numéro que **masqué**
 * (`24206****67`). Le renvoyer tel quel enregistrerait les astérisques. Pour en
 * changer, on le saisit en entier — c'est voulu, et le message le dit.
 */
function PayoutAccountForm({
  vendor,
  token,
  check,
  onDone,
}: {
  vendor: Restaurant;
  token: string | null;
  check?: ReadinessCheck;
  onDone: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<PayoutProvider>('MTN_MOMO');
  const [holder, setHolder] = useState('');
  const mutation = useUpdateVendorPayoutAccount(token, vendor.id);

  const done = check?.status === 'OK';

  return (
    <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
      {/* L'état vient du serveur : l'interface ne recalcule pas « est-il
          payable », elle affiche ce que la checklist d'activation a décidé. */}
      <div
        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
          done
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        }`}
      >
        {done ? (
          <Check size={14} className="mt-0.5 shrink-0" />
        ) : (
          <Wallet size={14} className="mt-0.5 shrink-0" />
        )}
        <span>
          {check?.detail ??
            (done
              ? 'Compte de reversement enregistré.'
              : 'Aucun compte de reversement — ce vendeur ne pourra pas être payé.')}
        </span>
      </div>

      <StepShell
        title="Compte de reversement"
        hint="Numéro Mobile Money sur lequel ce vendeur sera payé. Distinct du téléphone du commerce. Le serveur ne renvoie jamais le numéro en clair : pour le changer, saisissez-le en entier."
        onSave={() => {
          // Miroir du contrôle serveur (242 optionnel + 0 + [456] + 7 chiffres).
          // Il évite un aller-retour, il ne remplace rien : le backend valide
          // de toute façon, et c'est lui qui décide.
          const digits = phone.replace(/\D/g, '');
          if (!/^(242)?0?[456]\d{7}$/.test(digits)) {
            toast.error('Numéro Mobile Money congolais invalide (ex. 06 123 45 67).');
            return;
          }
          mutation.mutate(
            {
              payoutPhoneNumber: phone.trim(),
              payoutProvider: provider,
              ...(holder.trim() ? { payoutAccountName: holder.trim() } : {}),
            },
            {
              onSuccess: () => {
                toast.success('Compte de reversement enregistré');
                setPhone('');
                onDone();
              },
              onError: (e) => toast.error(errText(e)),
            },
          );
        }}
        saving={mutation.isPending}
      >
        <Field
          label="Numéro de reversement"
          hint={
            done
              ? 'Un compte est déjà enregistré — saisir un numéro le remplace.'
              : 'Ex. 06 123 45 67'
          }
        >
          <Input value={phone} onChange={setPhone} type="tel" placeholder="06 123 45 67" />
        </Field>
        <Field label="Opérateur">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as PayoutProvider)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="MTN_MOMO">MTN Mobile Money</option>
            <option value="AIRTEL_MONEY">Airtel Money</option>
          </select>
        </Field>
        <Field
          label="Titulaire du compte (facultatif)"
          hint="Pour vérification humaine avant envoi. Jamais transmis au prestataire."
        >
          <Input value={holder} onChange={setHolder} placeholder="—" />
        </Field>
      </StepShell>
    </div>
  );
}

// ─── Étape 8 — catalogue ─────────────────────────────────────────────────────

function CatalogStep({
  vendor,
  token,
  check,
}: {
  vendor: Restaurant;
  token: string | null;
  check?: ReadinessCheck;
}) {
  // Le catalogue d'un vendeur en cours d'onboarding est, par construction,
  // celui d'un commerce encore `DRAFT` : il n'existe pas pour la route
  // publique. Cette étape comptait donc toujours zéro produit.
  const { data: products } = useProducts(vendor.id, token);
  const count = Array.isArray(products) ? products.length : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Catalogue
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Au moins un produit vendable est nécessaire : sans lui, le client
          ouvrirait une boutique vide.
        </p>
      </div>

      <div
        className={`rounded-lg p-4 border ${
          check?.status === 'OK'
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
        }`}
      >
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          {check?.detail ?? `${count} produit(s)`}
        </p>
      </div>

      <a
        href={`/produits?restaurantId=${vendor.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >
        Gérer le catalogue de ce vendeur <ExternalLink size={14} />
      </a>

      <p className="text-xs text-zinc-500">
        Un produit doit avoir un prix supérieur à zéro et au moins une variante
        pour être commandable.
      </p>
    </div>
  );
}

// ─── Étape 9 — vérification ──────────────────────────────────────────────────

function ReviewStep({
  vendor,
  token,
  report,
}: {
  vendor: Restaurant;
  token: string | null;
  report?: OnboardingReport;
}) {
  const { data: preview, isLoading } = useVendorPreview(token, vendor.id);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Vérification
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Ce que verra le client, et ce qui reste à compléter.
        </p>
      </div>

      <div className="space-y-1.5">
        {report?.checks.map((c) => (
          <div
            key={c.key}
            className="flex items-start gap-2.5 text-sm py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
          >
            <StepIcon
              state={
                c.status === 'OK' ? 'ok' : c.blocking ? 'blocking' : 'warning'
              }
            />
            <div className="min-w-0 flex-1">
              <span
                className={
                  c.status === 'OK'
                    ? 'text-zinc-600 dark:text-zinc-400'
                    : 'text-zinc-900 dark:text-zinc-100 font-medium'
                }
              >
                {c.label}
              </span>
              {!c.blocking && c.status !== 'OK' && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600">
                  recommandé
                </span>
              )}
              {c.detail && (
                <p className="text-xs text-zinc-500 mt-0.5">{c.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin text-zinc-400" size={18} />
      ) : (
        preview && <ClientPreview vendor={preview.vendor} />
      )}
    </div>
  );
}

/** Rendu approché de la fiche client, à partir des données réellement servies. */
function ClientPreview({ vendor }: { vendor: Restaurant }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wide text-zinc-500">
        Aperçu client
      </div>
      <div className="p-4 flex gap-4">
        {vendor.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.imageUrl}
            alt=""
            className="w-20 h-20 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{vendor.nom}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {vendor.description || <em>Aucune description</em>}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {vendor.adresse}
            {vendor.quartier && ` — ${vendor.quartier.nom}`}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {vendor.estimatedDeliveryTimeMin}–{vendor.estimatedDeliveryTimeMax} min ·{' '}
            {vendor.fixedDeliveryFee} XAF de livraison
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {vendor.products?.length ?? 0} produit(s)
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────────

const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

function StepShell({
  title,
  hint,
  children,
  onSave,
  saving,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
      </div>
      <div className="space-y-4 flex flex-col">{children}</div>
      <div className="pt-2 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer et continuer'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">
        {label}
      </span>
      {hint && <span className="block text-[10px] text-zinc-500 mt-0.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
      {...rest}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={inputCls}
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary-500"
      />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  );
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : 'Une erreur est survenue';
}
