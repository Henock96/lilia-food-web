'use client';

import { useState } from 'react';
import {
  useMyRestaurant, useRestaurants, useRestaurant,
  useUpdateRestaurant, useUpdateDeliverySettings, useSetOperatingHours,
  type OperatingHourInput,
} from '@lilia/api-client';
import type { Restaurant, OperatingHours, DeliveryPriceMode } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Store, Bike, Clock, AlertCircle } from 'lucide-react';

const DAYS: { key: string; label: string }[] = [
  { key: 'LUNDI', label: 'Lundi' },
  { key: 'MARDI', label: 'Mardi' },
  { key: 'MERCREDI', label: 'Mercredi' },
  { key: 'JEUDI', label: 'Jeudi' },
  { key: 'VENDREDI', label: 'Vendredi' },
  { key: 'SAMEDI', label: 'Samedi' },
  { key: 'DIMANCHE', label: 'Dimanche' },
];

const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

// ─── Section Général ─────────────────────────────────────────────────────────

function GeneralSection({ restaurant, token }: { restaurant: Restaurant; token: string | null }) {
  const [nom, setNom] = useState(restaurant.nom);
  const [adresse, setAdresse] = useState(restaurant.adresse);
  const [phone, setPhone] = useState(restaurant.phone);
  const [imageUrl, setImageUrl] = useState(restaurant.imageUrl ?? '');
  const update = useUpdateRestaurant(token);

  function handleSave() {
    if (!nom.trim() || !adresse.trim() || !phone.trim()) {
      toast.error('Nom, adresse et téléphone sont requis');
      return;
    }
    update.mutate(
      { id: restaurant.id, data: {
        nom: nom.trim(), adresse: adresse.trim(), phone: phone.trim(),
        imageUrl: imageUrl.trim() || undefined,
      } },
      {
        onSuccess: () => toast.success('Informations mises à jour'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement'),
      },
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-4">
      <Field label="Nom du restaurant *">
        <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Adresse *">
        <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Téléphone *">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Image (URL)">
        <input
          value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…" className={inputCls}
        />
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mt-2 h-24 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
        )}
      </Field>
      <SaveBar saving={update.isPending} onSave={handleSave} />
    </div>
  );
}

// ─── Section Livraison ───────────────────────────────────────────────────────

function DeliverySection({ restaurant, token }: { restaurant: Restaurant; token: string | null }) {
  const [mode, setMode] = useState<DeliveryPriceMode>(restaurant.deliveryPriceMode);
  const [fixedFee, setFixedFee] = useState(String(restaurant.fixedDeliveryFee));
  const [minOrder, setMinOrder] = useState(String(restaurant.minimumOrderAmount));
  const [etaMin, setEtaMin] = useState(String(restaurant.estimatedDeliveryTimeMin));
  const [etaMax, setEtaMax] = useState(String(restaurant.estimatedDeliveryTimeMax));
  const update = useUpdateDeliverySettings(token);

  function handleSave() {
    const nums = { fixedFee, minOrder, etaMin, etaMax };
    if (Object.values(nums).some((v) => v.trim() === '' || !Number.isFinite(Number(v)))) {
      toast.error('Les champs numériques doivent être renseignés');
      return;
    }
    if (Number(etaMax) < Number(etaMin)) {
      toast.error('Le délai max doit être ≥ au délai min');
      return;
    }
    update.mutate(
      { id: restaurant.id, data: {
        deliveryPriceMode: mode,
        fixedDeliveryFee: Number(fixedFee),
        minimumOrderAmount: Number(minOrder),
        estimatedDeliveryTimeMin: Number(etaMin),
        estimatedDeliveryTimeMax: Number(etaMax),
      } },
      {
        onSuccess: () => toast.success('Paramètres de livraison mis à jour'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement'),
      },
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-4">
      <Field label="Mode de tarification">
        <div className="grid grid-cols-2 gap-2">
          {(['FIXED', 'ZONE_BASED'] as DeliveryPriceMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                mode === m
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {m === 'FIXED' ? 'Frais fixes' : 'Selon la zone'}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frais de livraison fixes (FCFA)">
          <input type="number" min="0" value={fixedFee} onChange={(e) => setFixedFee(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Commande minimum (FCFA)">
          <input type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Délai estimé min (min)">
          <input type="number" min="0" value={etaMin} onChange={(e) => setEtaMin(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Délai estimé max (min)">
          <input type="number" min="0" value={etaMax} onChange={(e) => setEtaMax(e.target.value)} className={inputCls} />
        </Field>
      </div>
      {mode === 'ZONE_BASED' && (
        <p className="text-[11px] text-zinc-400">
          En mode « selon la zone », les frais sont calculés par quartier (configurés dans Zones par l&apos;admin).
        </p>
      )}
      <SaveBar saving={update.isPending} onSave={handleSave} />
    </div>
  );
}

// ─── Section Horaires ────────────────────────────────────────────────────────

interface DayState { openTime: string; closeTime: string; isClosed: boolean }

function initHours(operatingHours?: OperatingHours[]): Record<string, DayState> {
  const map: Record<string, DayState> = {};
  for (const { key } of DAYS) {
    const existing = operatingHours?.find((h) => h.dayOfWeek === key);
    map[key] = existing
      ? { openTime: existing.openTime, closeTime: existing.closeTime, isClosed: existing.isClosed }
      : { openTime: '08:00', closeTime: '22:00', isClosed: false };
  }
  return map;
}

function HoursSection({ restaurant, token }: { restaurant: Restaurant; token: string | null }) {
  const [days, setDays] = useState<Record<string, DayState>>(() => initHours(restaurant.operatingHours));
  const update = useSetOperatingHours(token);

  function setDay(key: string, patch: Partial<DayState>) {
    setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function handleSave() {
    const hours: OperatingHourInput[] = DAYS.map(({ key }) => ({
      dayOfWeek: key,
      openTime: days[key].openTime,
      closeTime: days[key].closeTime,
      isClosed: days[key].isClosed,
    }));
    update.mutate(
      { id: restaurant.id, hours },
      {
        onSuccess: () => toast.success('Horaires mis à jour'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement'),
      },
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-3">
      {DAYS.map(({ key, label }) => {
        const d = days[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-sm text-zinc-700 dark:text-zinc-300 shrink-0">{label}</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer w-20 shrink-0">
              <input
                type="checkbox"
                checked={d.isClosed}
                onChange={(e) => setDay(key, { isClosed: e.target.checked })}
                className="accent-primary-500"
              />
              Fermé
            </label>
            <input
              type="time"
              value={d.openTime}
              disabled={d.isClosed}
              onChange={(e) => setDay(key, { openTime: e.target.value })}
              className={`${inputCls} flex-1 disabled:opacity-40`}
            />
            <span className="text-zinc-400 text-xs">→</span>
            <input
              type="time"
              value={d.closeTime}
              disabled={d.isClosed}
              onChange={(e) => setDay(key, { closeTime: e.target.value })}
              className={`${inputCls} flex-1 disabled:opacity-40`}
            />
          </div>
        );
      })}
      <p className="text-[11px] text-zinc-400">
        Un cron ouvre / ferme automatiquement le restaurant selon ces horaires, sauf si vous
        avez forcé l&apos;ouverture ou la fermeture manuellement depuis « Ma vitrine ».
      </p>
      <SaveBar saving={update.isPending} onSave={handleSave} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'delivery' | 'hours';

const TABS: { key: Tab; label: string; icon: typeof Store }[] = [
  { key: 'general', label: 'Général', icon: Store },
  { key: 'delivery', label: 'Livraison', icon: Bike },
  { key: 'hours', label: 'Horaires', icon: Clock },
];

export default function MonRestaurantPage() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('general');

  // RESTAURATEUR : son resto. ADMIN : sélection dans la liste.
  const mineQuery = useMyRestaurant(isAdmin ? null : token);
  const { data: allRestaurants = [] } = useRestaurants();
  const [selectedId, setSelectedId] = useState<string>('');
  if (isAdmin && !selectedId && allRestaurants.length > 0) {
    setSelectedId((allRestaurants[0] as Restaurant).id);
  }
  const adminQuery = useRestaurant(isAdmin ? selectedId : '');

  const restaurant = (isAdmin ? adminQuery.data : mineQuery.data) as Restaurant | undefined;
  const isLoading = isAdmin ? adminQuery.isLoading : mineQuery.isLoading;
  const noResto = !isAdmin && mineQuery.isError;

  if (noResto) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Aucun restaurant attribué
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Votre compte restaurateur n&apos;est associé à aucun restaurant.
          Contactez un administrateur Lilia pour finaliser votre activation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Sélecteur resto (ADMIN) */}
      {isAdmin && allRestaurants.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Restaurant :</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            {(allRestaurants as Restaurant[]).map((r) => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white dark:bg-dark-card text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {isLoading || !restaurant ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        // key={restaurant.id} → réinitialise l'état des formulaires quand on
        // change de restaurant (ADMIN) ou au premier chargement.
        <div key={restaurant.id}>
          {tab === 'general' && <GeneralSection restaurant={restaurant} token={token} />}
          {tab === 'delivery' && <DeliverySection restaurant={restaurant} token={token} />}
          {tab === 'hours' && <HoursSection restaurant={restaurant} token={token} />}
        </div>
      )}
    </div>
  );
}
