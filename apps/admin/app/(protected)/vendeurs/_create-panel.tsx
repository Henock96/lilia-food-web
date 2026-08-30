'use client';

import { useState } from 'react';
import { useCreateVendorOnboarding } from '@lilia/api-client';
import type { CreateVendorOnboardingDto, Restaurant, VendorType } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { X, Copy } from 'lucide-react';

interface FormState {
  vendorType: VendorType;
  ownerNom: string;
  ownerEmail: string;
  ownerPhone: string;
  nom: string;
  adresse: string;
  phone: string;
  description: string;
}

const EMPTY: FormState = {
  vendorType: 'RESTAURANT',
  ownerNom: '',
  ownerEmail: '',
  ownerPhone: '',
  nom: '',
  adresse: '',
  phone: '',
  description: '',
};

const VENDOR_TYPES: { value: VendorType; label: string; helper: string }[] = [
  { value: 'RESTAURANT', label: 'Restaurant', helper: 'Plats chauds, repas — validé d’office' },
  { value: 'HOME_COOK', label: 'Cuisine maison', helper: 'Pâtissiers, traiteurs — validation admin requise' },
  { value: 'BAKERY', label: 'Boulangerie', helper: 'Viennoiseries, pain — validation admin requise' },
  { value: 'BEVERAGE_SHOP', label: 'Boissons', helper: 'Sodas, jus, eaux (pas d’alcool) — validation admin requise' },
];

/**
 * Étape 1 de l'onboarding : le compte vendeur et la boutique.
 *
 * Deux différences avec le formulaire qu'il remplace :
 *
 * 1. **Aucun champ mot de passe.** L'administrateur ne choisit plus le secret
 *    du vendeur pour le lui transmettre ensuite par WhatsApp. Une invitation
 *    d'activation part vers son e-mail ; lui seul définira son mot de passe.
 * 2. **La boutique naît invisible.** Les huit champs ci-dessous ne suffisent
 *    pas à publier : le wizard prend le relais pour les horaires, le GPS et le
 *    catalogue, et l'activation est un geste distinct.
 */
export function CreateVendorPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (vendor: Restaurant) => void;
}) {
  const { token } = useAuthStore();
  const mutation = useCreateVendorOnboarding(token);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dto: CreateVendorOnboardingDto = {
      vendorType: form.vendorType,
      ownerEmail: form.ownerEmail.trim(),
      ownerNom: form.ownerNom.trim(),
      ownerPhone: form.ownerPhone.trim(),
      nom: form.nom.trim(),
      adresse: form.adresse.trim(),
      phone: form.phone.trim(),
    };
    if (form.description.trim()) dto.description = form.description.trim();

    mutation.mutate(dto, {
      onSuccess: (res) => {
        // Si l'e-mail n'est pas parti, le backend renvoie le lien d'activation
        // pour que l'admin puisse débloquer le vendeur au lieu de le laisser
        // sans accès. On l'affiche plutôt que de prétendre au succès.
        if (res.invitation && !res.invitation.emailSent && res.invitation.activationLink) {
          setFallbackLink(res.invitation.activationLink);
          toast.warning("Boutique créée, mais l'e-mail d'invitation n'est pas parti.");
          return;
        }
        toast.success(
          `${res.vendor.nom} créé. Invitation envoyée à ${form.ownerEmail}.`,
        );
        onCreated?.(res.vendor);
        onClose();
      },
      onError: (err: unknown) =>
        toast.error((err as Error).message ?? 'Erreur lors de la création'),
    });
  }

  if (fallbackLink) {
    return (
      <Overlay>
        <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 m-auto">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Transmettez ce lien au vendeur
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            La boutique est créée, mais l&apos;e-mail d&apos;invitation n&apos;a pas
            pu être envoyé. Ce lien permet au vendeur de définir son mot de passe.
            Il est personnel — transmettez-le par un canal sûr.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={fallbackLink}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            />
            <button
              onClick={() => {
                void navigator.clipboard.writeText(fallbackLink);
                toast.success('Lien copié');
              }}
              className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm inline-flex items-center gap-1.5"
            >
              <Copy size={14} /> Copier
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300"
          >
            Fermer
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
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
              Étape 1 sur 8 — la boutique restera invisible jusqu&apos;à son activation.
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

        <Section title="Propriétaire">
          <p className="text-xs text-zinc-500 -mt-1">
            Un compte est créé et une invitation part vers cette adresse. Le
            vendeur choisira lui-même son mot de passe — vous n&apos;avez rien à
            lui transmettre.
          </p>
          <Field label="Nom du propriétaire *">
            <Input value={form.ownerNom} onChange={(v) => set('ownerNom', v)} required />
          </Field>
          <Field label="E-mail *" hint="Sert d'identifiant de connexion.">
            <Input
              type="email"
              value={form.ownerEmail}
              onChange={(v) => set('ownerEmail', v)}
              required
            />
          </Field>
          <Field label="Téléphone *" hint="Un SMS l'avertit que son espace est prêt.">
            <Input
              value={form.ownerPhone}
              onChange={(v) => set('ownerPhone', v)}
              placeholder="060000000"
              required
            />
          </Field>
        </Section>

        <Section title="Boutique">
          <Field label="Nom commercial *">
            <Input value={form.nom} onChange={(v) => set('nom', v)} required />
          </Field>
          <Field label="Adresse *">
            <Input
              value={form.adresse}
              onChange={(v) => set('adresse', v)}
              placeholder="Quartier, repère"
              required
            />
          </Field>
          <Field label="Téléphone du commerce *">
            <Input
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder="060000000"
              required
            />
          </Field>
          <Field label="Description" hint="Vous pourrez la compléter à l'étape suivante.">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </Field>
        </Section>

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
            {mutation.isPending ? 'Création…' : 'Créer et continuer'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">{children}</div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">{label}</span>
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
