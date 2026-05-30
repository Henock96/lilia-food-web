'use client';

import { useState } from 'react';
import { useCreateRestaurantWithOwner } from '@lilia/api-client';
import type { CreateRestaurantWithOwnerDto, VendorType } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface FormState {
  vendorType: VendorType;
  ownerFirebaseUid: string;
  email: string;
  password: string;
  nom: string;
  phone: string;
  restaurantNom: string;
  restaurantAdresse: string;
  restaurantPhone: string;
  restaurantImageUrl: string;
  acceptsPreorders: boolean;
  preorderLeadHours: string;
  maxOrdersPerDay: string;
  story: string;
  specialties: string;
  productionNote: string;
}

const EMPTY: FormState = {
  vendorType: 'RESTAURANT',
  ownerFirebaseUid: '',
  email: '',
  password: '',
  nom: '',
  phone: '',
  restaurantNom: '',
  restaurantAdresse: '',
  restaurantPhone: '',
  restaurantImageUrl: '',
  acceptsPreorders: false,
  preorderLeadHours: '24',
  maxOrdersPerDay: '',
  story: '',
  specialties: '',
  productionNote: '',
};

const VENDOR_TYPES: { value: VendorType; label: string; helper: string }[] = [
  { value: 'RESTAURANT', label: 'Restaurant', helper: 'Plats chauds, repas — auto-approuvé' },
  { value: 'HOME_COOK', label: 'Cuisine maison', helper: 'Pâtissiers, traiteurs — validation admin requise' },
  { value: 'BAKERY', label: 'Boulangerie', helper: 'Viennoiseries, pain — validation admin requise' },
  { value: 'BEVERAGE_SHOP', label: 'Boissons', helper: 'Sodas, jus, eaux (pas d\'alcool) — validation admin requise' },
];

/**
 * Panneau latéral de création vendeur + owner (LIL-116).
 * POST /admin/restaurants — sans vendorType → flux RESTAURANT historique
 * (auto-approuvé). Avec vendorType non-RESTAURANT → adminApproved=false.
 */
export function CreateVendorPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore();
  const mutation = useCreateRestaurantWithOwner(token);
  const [form, setForm] = useState<FormState>(EMPTY);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isPreorderVendor =
    form.vendorType === 'HOME_COOK' || form.vendorType === 'BAKERY';
  const isHomeCookOrBakery = isPreorderVendor;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dto: CreateRestaurantWithOwnerDto = {
      ownerFirebaseUid: form.ownerFirebaseUid.trim(),
      email: form.email.trim(),
      password: form.password,
      nom: form.nom.trim(),
      restaurantNom: form.restaurantNom.trim(),
      restaurantAdresse: form.restaurantAdresse.trim(),
      restaurantPhone: form.restaurantPhone.trim(),
    };
    if (form.phone.trim()) dto.phone = form.phone.trim();
    if (form.restaurantImageUrl.trim()) dto.restaurantImageUrl = form.restaurantImageUrl.trim();
    if (form.vendorType !== 'RESTAURANT') dto.vendorType = form.vendorType;
    if (form.acceptsPreorders) {
      dto.acceptsPreorders = true;
      const lead = parseInt(form.preorderLeadHours, 10);
      if (!Number.isNaN(lead)) dto.preorderLeadHours = lead;
    }
    const cap = parseInt(form.maxOrdersPerDay, 10);
    if (!Number.isNaN(cap) && cap > 0) dto.maxOrdersPerDay = cap;
    if (form.story.trim()) dto.story = form.story.trim();
    if (form.productionNote.trim()) dto.productionNote = form.productionNote.trim();
    const specialties = form.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (specialties.length) dto.specialties = specialties;

    mutation.mutate(dto, {
      onSuccess: () => {
        toast.success(
          form.vendorType === 'RESTAURANT'
            ? `${form.restaurantNom} créé et activé`
            : `${form.restaurantNom} créé — en attente de validation`,
        );
        onClose();
      },
      onError: (err: unknown) =>
        toast.error((err as Error).message ?? 'Erreur lors de la création'),
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg h-full overflow-y-auto bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 space-y-5"
      >
        <div className="flex items-start justify-between sticky top-0 bg-white dark:bg-zinc-900 -mt-6 -mx-6 px-6 pt-6 pb-3 border-b border-zinc-200 dark:border-zinc-800 z-10">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Nouveau vendeur
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Crée le propriétaire Firebase + le vendeur en une seule étape.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Type de vendeur */}
        <Section title="Type de vendeur">
          <div className="grid grid-cols-1 gap-2">
            {VENDOR_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.vendorType === t.value
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="vendorType"
                  value={t.value}
                  checked={form.vendorType === t.value}
                  onChange={() => set('vendorType', t.value)}
                  className="mt-0.5 accent-primary-500"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.helper}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* Propriétaire */}
        <Section title="Propriétaire">
          <Field label="Firebase UID *" hint="UID Firebase déjà créé du propriétaire">
            <Input
              value={form.ownerFirebaseUid}
              onChange={(v) => set('ownerFirebaseUid', v)}
              required
              placeholder="abc123XYZ…"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email *">
              <Input
                type="email"
                value={form.email}
                onChange={(v) => set('email', v)}
                required
              />
            </Field>
            <Field label="Mot de passe *" hint="6 caractères minimum">
              <Input
                type="password"
                value={form.password}
                onChange={(v) => set('password', v)}
                required
                minLength={6}
              />
            </Field>
          </div>
          <Field label="Nom du propriétaire *">
            <Input
              value={form.nom}
              onChange={(v) => set('nom', v)}
              required
            />
          </Field>
          <Field label="Téléphone (perso)">
            <Input
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder="06xxxxxxxx"
            />
          </Field>
        </Section>

        {/* Vendeur */}
        <Section title="Vendeur">
          <Field label="Nom du vendeur *">
            <Input
              value={form.restaurantNom}
              onChange={(v) => set('restaurantNom', v)}
              required
            />
          </Field>
          <Field label="Adresse *">
            <Input
              value={form.restaurantAdresse}
              onChange={(v) => set('restaurantAdresse', v)}
              required
              placeholder="Quartier, repère"
            />
          </Field>
          <Field label="Téléphone *">
            <Input
              value={form.restaurantPhone}
              onChange={(v) => set('restaurantPhone', v)}
              required
            />
          </Field>
          <Field label="Image (URL)">
            <Input
              type="url"
              value={form.restaurantImageUrl}
              onChange={(v) => set('restaurantImageUrl', v)}
            />
          </Field>
        </Section>

        {/* Champs vendeurs avancés */}
        {(isPreorderVendor || isHomeCookOrBakery) && (
          <Section title="Capacité & précommandes">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptsPreorders}
                onChange={(e) => set('acceptsPreorders', e.target.checked)}
                className="accent-primary-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Accepte les précommandes
              </span>
            </label>
            {form.acceptsPreorders && (
              <Field
                label="Délai minimum (heures)"
                hint="Entre 1 et 168h (7 jours). Default 24h."
              >
                <Input
                  type="number"
                  value={form.preorderLeadHours}
                  onChange={(v) => set('preorderLeadHours', v)}
                  min={1}
                  max={168}
                />
              </Field>
            )}
            <Field
              label="Cap quotidien (commandes/jour)"
              hint="Vide = illimité"
            >
              <Input
                type="number"
                value={form.maxOrdersPerDay}
                onChange={(v) => set('maxOrdersPerDay', v)}
                min={1}
              />
            </Field>
          </Section>
        )}

        {form.vendorType !== 'RESTAURANT' && (
          <Section title="Profil enrichi (optionnel)">
            <Field label="Story" hint="Histoire du vendeur, présentation">
              <textarea
                value={form.story}
                onChange={(e) => set('story', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </Field>
            <Field label="Spécialités (séparées par virgules)">
              <Input
                value={form.specialties}
                onChange={(v) => set('specialties', v)}
                placeholder="Tarte tatin, Mille-feuille, Éclair"
              />
            </Field>
            <Field label="Note de production">
              <textarea
                value={form.productionNote}
                onChange={(e) => set('productionNote', e.target.value)}
                rows={2}
                placeholder="Ex: cuisson maison, livraison fraîche le matin"
                className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </Field>
          </Section>
        )}

        {/* Submit */}
        <div className="flex items-center gap-2 justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900 -mx-6 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Création…' : 'Créer le vendeur'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Form primitives ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
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
  type = 'text',
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      {...rest}
    />
  );
}
