import { describe, expect, it } from 'vitest';
import type { PlatformSettings } from '@lilia/types';
import {
  NUMBER_FIELD_SPECS,
  appUpdateStatus,
  buildSettingsPatch,
  isStaleSettingsConflict,
  parseNumberField,
  toSettingsForm,
} from './platform-settings-form';

/** Configuration de production au 22/09/2026. */
const PROD: PlatformSettings = {
  id: 'singleton',
  serviceFeePercent: 15,
  deliveryPricingMode: 'VENDOR_LEGACY',
  restaurantCommissionPercent: 10,
  loyaltyPointsPerOrder: 1,
  loyaltyPointValueXaf: 50,
  loyaltyMinRedemption: 1,
  referrerBonusPoints: 1,
  maintenanceMode: false,
  maintenanceMessage: '',
  minAppVersion: '1.3.0',
  latestAppVersion: '1.3.0',
  updateUrlAndroid: 'https://play.google.com/store/apps/details?id=com.dreesis.lilia.lilia_app',
  updateUrlIos: null,
  updateMessage: 'Nouvelle mise à jour Lilia Food disponible !🥳',
  modifiersEnabled: false,
  modifiersManagementEnabled: false,
  updatedAt: '2026-09-22T10:00:00.000Z',
};

function patchFrom(changes: Partial<ReturnType<typeof toSettingsForm>>, loaded = PROD) {
  return buildSettingsPatch({ ...toSettingsForm(loaded), ...changes }, loaded);
}

describe('saisie numérique stricte (SET-003)', () => {
  const decimal = NUMBER_FIELD_SPECS.serviceFeePercent;
  const integer = NUMBER_FIELD_SPECS.loyaltyPointValueXaf;

  it.each(['12,5', 'abc', '12foo', '', '  ', '-5', '1e3'])('refuse %p', (raw) => {
    expect('error' in parseNumberField(raw, decimal)).toBe(true);
  });
  it('la virgule décimale est expliquée, pas seulement refusée', () => {
    const r = parseNumberField('12,5', decimal);
    expect('error' in r && r.error).toMatch(/point/);
  });
  it('accepte un décimal et un entier', () => {
    expect(parseNumberField('12.5', decimal)).toEqual({ value: 12.5 });
    expect(parseNumberField(' 15 ', decimal)).toEqual({ value: 15 });
    expect(parseNumberField('50', integer)).toEqual({ value: 50 });
  });
  it('un entier attendu refuse un décimal', () => {
    expect('error' in parseNumberField('12.5', integer)).toBe(true);
  });
  it('une saisie invalide bloque tout le PATCH — aucun envoi, aucun succès', () => {
    const r = patchFrom({ serviceFeePercent: '12,5' });
    expect(r.ok).toBe(false);
  });
});

describe('PATCH minimal + verrou (SET-001)', () => {
  it('rien de modifié : aucun champ, seulement le verrou', () => {
    const r = patchFrom({});
    expect(r).toEqual({
      ok: true,
      changed: false,
      patch: { expectedUpdatedAt: PROD.updatedAt },
    });
  });
  it('seul le champ modifié part — les réglages de mise à jour ne sont pas réécrits', () => {
    const r = patchFrom({ serviceFeePercent: '12' });
    expect(r.ok && r.patch).toEqual({ expectedUpdatedAt: PROD.updatedAt, serviceFeePercent: 12 });
  });
  it('maintenanceMessage "" en base et vide au formulaire : pas de faux changement', () => {
    const r = patchFrom({ maintenanceMessage: '   ' });
    expect(r.ok && r.changed).toBe(false);
  });
});

describe('tarification de la livraison (F3-02)', () => {
  it('la bascule vers la grille plateforme part seule', () => {
    const r = patchFrom({ deliveryPricingMode: 'PLATFORM' });
    expect(r).toEqual({
      ok: true,
      changed: true,
      patch: { expectedUpdatedAt: PROD.updatedAt, deliveryPricingMode: 'PLATFORM' },
    });
  });

  it('mode inchangé : pas de champ dans le PATCH', () => {
    const r = patchFrom({});
    expect(r.ok && 'deliveryPricingMode' in r.patch).toBe(false);
  });
});

describe('versement automatique aux vendeurs (F3-07)', () => {
  const withPayout: PlatformSettings = {
    ...PROD,
    vendorPayoutAutoEnabled: false,
    vendorPayoutDelayMinutes: 60,
  };

  it('allumer n’envoie que l’interrupteur', () => {
    const r = patchFrom({ vendorPayoutAutoEnabled: true }, withPayout);
    expect(r).toMatchObject({ ok: true, changed: true });
    if (r.ok) {
      expect(r.patch.vendorPayoutAutoEnabled).toBe(true);
      expect(r.patch).not.toHaveProperty('vendorPayoutDelayMinutes');
    }
  });

  it('délai : entier de 0 à 1 440 minutes', () => {
    const ok = patchFrom({ vendorPayoutDelayMinutes: '90' }, withPayout);
    expect(ok.ok && ok.patch.vendorPayoutDelayMinutes).toBe(90);
    for (const bad of ['1441', '1.5', '-1', '']) {
      expect(patchFrom({ vendorPayoutDelayMinutes: bad }, withPayout).ok).toBe(false);
    }
  });

  it('serveur antérieur (champs absents) : aucun faux changement', () => {
    const r = patchFrom({}, PROD);
    expect(r.ok && r.changed).toBe(false);
  });
});

describe('canal de mise à jour (CONFIG-UPDATE-001)', () => {
  it('vider un champ envoie null, jamais ""', () => {
    const r = patchFrom({ updateMessage: '', updateUrlAndroid: '' });
    expect(r.ok && r.patch).toMatchObject({ updateMessage: null, updateUrlAndroid: null });
  });
  it('lever le blocage : null, sans confirmation', () => {
    const r = patchFrom({ minAppVersion: '' });
    expect(r.ok && r.patch).toMatchObject({ minAppVersion: null });
  });
  it('poser un nouveau blocage sans BLOQUER : refusé', () => {
    const r = patchFrom({ minAppVersion: '1.3.1', latestAppVersion: '1.3.1' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.join(' ')).toMatch(/BLOQUER/);
  });
  it('poser un nouveau blocage avec BLOQUER (casse indifférente) : accepté', () => {
    const r = patchFrom({ minAppVersion: '1.3.1', latestAppVersion: '1.3.1', blockConfirmation: 'bloquer' });
    expect(r.ok && r.patch).toMatchObject({ minAppVersion: '1.3.1', latestAppVersion: '1.3.1' });
    expect(r.ok && 'blockConfirmation' in r.patch).toBe(false);
  });
  it('min > latest : refusé', () => {
    const r = patchFrom({ minAppVersion: '2.0.0', blockConfirmation: 'BLOQUER' });
    expect(r.ok).toBe(false);
  });
  it('version invalide : refusée', () => {
    expect(patchFrom({ latestAppVersion: 'abc' }).ok).toBe(false);
  });
  it('vider latest sous un blocage actif : refusé', () => {
    expect(patchFrom({ latestAppVersion: '' }).ok).toBe(false);
  });
  it('URL iOS de mauvais domaine : refusée', () => {
    expect(patchFrom({ updateUrlIos: 'https://example.com/app/id1234567890' }).ok).toBe(false);
  });
  it('« v1.3.0 » est normalisé et ne compte pas comme un changement', () => {
    const r = patchFrom({ minAppVersion: 'v1.3.0' });
    expect(r.ok && r.changed).toBe(false);
  });
  it('message de plus de 300 caractères : refusé', () => {
    expect(patchFrom({ updateMessage: 'x'.repeat(301) }).ok).toBe(false);
  });
});

describe('appUpdateStatus', () => {
  it('blocage actif', () => {
    expect(appUpdateStatus(PROD)).toEqual({ kind: 'blocking', minVersion: '1.3.0' });
  });
  it('recommandation seule', () => {
    expect(appUpdateStatus({ minAppVersion: null, latestAppVersion: '1.4.0' })).toEqual({
      kind: 'recommending',
      latestVersion: '1.4.0',
    });
  });
  it('rien', () => {
    expect(appUpdateStatus({ minAppVersion: null, latestAppVersion: null })).toEqual({ kind: 'idle' });
  });
});

describe('état hérité incohérent (aligné sur l’Admin Flutter)', () => {
  it('un blocage sans dernière version en base bloque tout enregistrement jusqu’à correction', () => {
    const legacy = { ...PROD, latestAppVersion: null };
    const r = patchFrom({ serviceFeePercent: '12' }, legacy);
    expect(r.ok).toBe(false);
  });
});

describe('409 : conflit entre administrateurs ou refus métier (24/09/2026)', () => {
  it('SETTINGS_STALE : conflit, on propose de recharger', () => {
    expect(isStaleSettingsConflict({ status: 409, code: 'SETTINGS_STALE' })).toBe(true);
  });

  it('grille non publiée : PAS un conflit, le message du serveur doit s’afficher', () => {
    expect(
      isStaleSettingsConflict({
        status: 409,
        code: 'DELIVERY_TARIFF_NOT_PUBLISHED',
        message: 'Publiez une grille de livraison avant de passer la tarification en mode plateforme.',
      }),
    ).toBe(false);
  });

  it('serveur antérieur au code : reconnu par son texte', () => {
    expect(
      isStaleSettingsConflict({
        status: 409,
        message:
          'La configuration a été modifiée par un autre administrateur depuis que vous l’avez ouverte.',
      }),
    ).toBe(true);
    expect(
      isStaleSettingsConflict({ status: 409, message: 'Publiez une grille de livraison…' }),
    ).toBe(false);
  });

  it('autre statut : jamais un conflit', () => {
    expect(isStaleSettingsConflict({ status: 400, code: 'SETTINGS_STALE' })).toBe(false);
  });
});

describe('F3-09 — options & suppléments : ordre de déploiement', () => {
  it('allumer les options côté clients : seul champ envoyé', () => {
    const r = patchFrom({ modifiersEnabled: true });
    expect(r).toMatchObject({ ok: true, patch: { modifiersEnabled: true } });
    if (r.ok) expect(r.patch).not.toHaveProperty('modifiersManagementEnabled');
  });

  it('éditeur vendeur sans options côté clients : refusé avant l’envoi', () => {
    const r = patchFrom({ modifiersManagementEnabled: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/activez d'abord les options/);
  });

  it('les deux ensemble : accepté', () => {
    expect(patchFrom({ modifiersEnabled: true, modifiersManagementEnabled: true })).toMatchObject({
      ok: true,
      patch: { modifiersEnabled: true, modifiersManagementEnabled: true },
    });
  });
});
