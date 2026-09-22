import type { PlatformSettings, UpdatePlatformSettingsPayload } from '@lilia/types';
import {
  BLOCK_CONFIRMATION_WORD,
  normalizeVersion,
  requiresBlockConfirmation,
  validateAppUpdate,
} from './app-update-rules';

/**
 * Formulaire « Paramètres plateforme » — logique pure, testée
 * (`platform-settings-form.test.ts`).
 *
 * Deux garanties portées ici :
 *
 * - **Aucun faux succès sur une saisie numérique** : `12,5`, `abc`, `12foo` ou
 *   un champ vide bloquent l'envoi avec un message nommant le champ. On ne
 *   retombe jamais en silence sur l'ancienne valeur (SET-003, relevé dans
 *   l'Admin Flutter) ni sur 0 (`Number('') === 0`).
 * - **Le PATCH ne porte que ce qui a changé**, plus l'`updatedAt` chargé
 *   (SET-001). Envoyer le formulaire entier réécrivait des valeurs périmées :
 *   un administrateur qui corrigeait les frais pouvait effacer un blocage
 *   posé entre-temps par un autre. Le serveur répond 409 si la configuration
 *   a bougé depuis le chargement.
 */

export type NumberFieldKey =
  | 'serviceFeePercent'
  | 'restaurantCommissionPercent'
  | 'loyaltyPointsPerOrder'
  | 'loyaltyPointValueXaf'
  | 'loyaltyMinRedemption'
  | 'referrerBonusPoints';

/** Champs numériques : clé → libellé + type (décimal ou entier). */
export const NUMBER_FIELD_SPECS: Record<NumberFieldKey, { label: string; integer: boolean }> = {
  serviceFeePercent: { label: 'Frais de service', integer: false },
  restaurantCommissionPercent: { label: 'Commission vendeur', integer: false },
  loyaltyPointsPerOrder: { label: 'Points / commande livrée', integer: true },
  loyaltyPointValueXaf: { label: "Valeur d'un point", integer: true },
  loyaltyMinRedemption: { label: "Seuil minimum d'usage", integer: true },
  referrerBonusPoints: { label: 'Bonus parrain', integer: true },
};

export interface SettingsForm extends Record<NumberFieldKey, string> {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minAppVersion: string;
  latestAppVersion: string;
  updateUrlAndroid: string;
  updateUrlIos: string;
  updateMessage: string;
  /** Mot de confirmation d'un blocage — jamais envoyé. */
  blockConfirmation: string;
}

export function toSettingsForm(s: PlatformSettings): SettingsForm {
  return {
    serviceFeePercent: String(s.serviceFeePercent),
    restaurantCommissionPercent: String(s.restaurantCommissionPercent),
    loyaltyPointsPerOrder: String(s.loyaltyPointsPerOrder),
    loyaltyPointValueXaf: String(s.loyaltyPointValueXaf),
    loyaltyMinRedemption: String(s.loyaltyMinRedemption),
    referrerBonusPoints: String(s.referrerBonusPoints),
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage ?? '',
    minAppVersion: s.minAppVersion ?? '',
    latestAppVersion: s.latestAppVersion ?? '',
    updateUrlAndroid: s.updateUrlAndroid ?? '',
    updateUrlIos: s.updateUrlIos ?? '',
    updateMessage: s.updateMessage ?? '',
    blockConfirmation: '',
  };
}

const DECIMAL = /^\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

/**
 * Nombre strict ou message d'erreur. Le signe moins n'est pas admis : aucun de
 * ces réglages n'est négatif, et le serveur le refuserait de toute façon.
 */
export function parseNumberField(
  raw: string,
  spec: { label: string; integer: boolean },
): { value: number } | { error: string } {
  const t = raw.trim();
  if (t === '') return { error: `${spec.label} : champ obligatoire.` };
  if (!spec.integer && /^\d+,\d+$/.test(t)) {
    return { error: `${spec.label} : utilisez un point pour les décimales (ex : 12.5).` };
  }
  if (!(spec.integer ? INTEGER : DECIMAL).test(t)) {
    return {
      error: spec.integer
        ? `${spec.label} : nombre entier attendu (« ${t} » n'en est pas un).`
        : `${spec.label} : nombre attendu (« ${t} » n'en est pas un).`,
    };
  }
  return { value: Number(t) };
}

/** Texte libre facultatif : blanc → `null`, comme au serveur. */
function textOrNull(raw: string): string | null {
  const t = raw.trim();
  return t === '' ? null : t;
}

export type BuildPatchResult =
  | { ok: true; patch: UpdatePlatformSettingsPayload; changed: boolean }
  | { ok: false; errors: string[] };

/**
 * Construit le PATCH à partir du formulaire et de la configuration **telle
 * qu'elle a été chargée**. N'y figurent que les champs modifiés, plus
 * `expectedUpdatedAt`.
 */
export function buildSettingsPatch(form: SettingsForm, loaded: PlatformSettings): BuildPatchResult {
  const errors: string[] = [];
  const patch: UpdatePlatformSettingsPayload = { expectedUpdatedAt: loaded.updatedAt };

  for (const key of Object.keys(NUMBER_FIELD_SPECS) as NumberFieldKey[]) {
    const parsed = parseNumberField(form[key], NUMBER_FIELD_SPECS[key]);
    if ('error' in parsed) {
      errors.push(parsed.error);
    } else if (parsed.value !== loaded[key]) {
      patch[key] = parsed.value;
    }
  }

  if (form.maintenanceMode !== loaded.maintenanceMode) {
    patch.maintenanceMode = form.maintenanceMode;
  }
  const maintenanceMessage = textOrNull(form.maintenanceMessage);
  if (maintenanceMessage !== textOrNull(loaded.maintenanceMessage ?? '')) {
    patch.maintenanceMessage = maintenanceMessage;
  }

  // Canal de mise à jour
  const minAppVersion = normalizeVersion(form.minAppVersion);
  const latestAppVersion = normalizeVersion(form.latestAppVersion);
  const updateUrlAndroid = textOrNull(form.updateUrlAndroid);
  const updateUrlIos = textOrNull(form.updateUrlIos);
  const updateMessage = textOrNull(form.updateMessage);

  if (minAppVersion !== (loaded.minAppVersion ?? null)) patch.minAppVersion = minAppVersion;
  if (latestAppVersion !== (loaded.latestAppVersion ?? null)) {
    patch.latestAppVersion = latestAppVersion;
  }
  if (updateUrlAndroid !== (loaded.updateUrlAndroid ?? null)) {
    patch.updateUrlAndroid = updateUrlAndroid;
  }
  if (updateUrlIos !== (loaded.updateUrlIos ?? null)) patch.updateUrlIos = updateUrlIos;
  if (updateMessage !== textOrNull(loaded.updateMessage ?? '')) {
    patch.updateMessage = updateMessage;
  }
  if (updateMessage !== null && updateMessage.length > 300) {
    errors.push('Le message de mise à jour ne doit pas dépasser 300 caractères.');
  }
  if (maintenanceMessage !== null && maintenanceMessage.length > 500) {
    errors.push('Le message de maintenance ne doit pas dépasser 500 caractères.');
  }

  // Toute la section est jugée, même non modifiée — comme l'Admin Flutter : un
  // état hérité incohérent (blocage sans dernière version, lien de gabarit)
  // doit être corrigé avant tout autre enregistrement plutôt que de rester
  // invisible. Le serveur, lui, ne juge que ce qu'on lui envoie : la porte de
  // sortie d'urgence (changer les frais) reste ouverte côté API.
  errors.push(
    ...validateAppUpdate({
      minVersion: form.minAppVersion,
      latestVersion: form.latestAppVersion,
      urlAndroid: form.updateUrlAndroid,
      urlIos: form.updateUrlIos,
    }),
  );

  if (
    requiresBlockConfirmation(form.minAppVersion, loaded.minAppVersion) &&
    form.blockConfirmation.trim().toUpperCase() !== BLOCK_CONFIRMATION_WORD
  ) {
    errors.push(
      `Vous êtes sur le point de bloquer le parc : tapez ${BLOCK_CONFIRMATION_WORD} ` +
        'dans le champ de confirmation.',
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, patch, changed: Object.keys(patch).length > 1 };
}

/** Ce qu'un administrateur doit comprendre d'un coup d'œil. */
export type AppUpdateStatus =
  | { kind: 'blocking'; minVersion: string }
  | { kind: 'recommending'; latestVersion: string }
  | { kind: 'idle' };

export function appUpdateStatus(s: Pick<PlatformSettings, 'minAppVersion' | 'latestAppVersion'>): AppUpdateStatus {
  if (s.minAppVersion) return { kind: 'blocking', minVersion: s.minAppVersion };
  if (s.latestAppVersion) return { kind: 'recommending', latestVersion: s.latestAppVersion };
  return { kind: 'idle' };
}
