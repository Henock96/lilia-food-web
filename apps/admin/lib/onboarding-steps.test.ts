import { describe, expect, it } from 'vitest';
import type { OnboardingReport, ReadinessCheck } from '@lilia/types';

import { ONBOARDING_STEPS, canLeaveStep, stepState } from './onboarding-steps';

/**
 * Avance de l'assistant de configuration vendeur.
 *
 * Deux défauts, de la même famille, corrigés ici.
 *
 * 1. La case `payout` — ajoutée côté backend en septembre 2026 — n'était
 *    rattachée à **aucune** étape, et aucun champ de l'assistant web ne
 *    permettait de la remplir. Elle est pourtant bloquante : un vendeur
 *    configuré depuis le web restait inactivable, sans qu'aucun écran ne dise
 *    ni pourquoi ni où corriger.
 * 2. L'avance était inconditionnelle : tout enregistrement réussi passait à
 *    l'étape suivante. Depuis que « Commercial » porte deux formulaires, ce
 *    raccourci escamoterait le compte de reversement — exactement le symptôme
 *    constaté sur l'application Flutter, « le champ s'affiche une fois puis
 *    disparaît ».
 */
const check = (
  key: ReadinessCheck['key'],
  blocking: boolean,
  ok: boolean,
): ReadinessCheck => ({
  key,
  label: key,
  status: ok ? 'OK' : 'MISSING',
  blocking,
});

const reportOf = (checks: ReadinessCheck[]): OnboardingReport => ({
  restaurantId: 'r_1',
  onboardingStatus: 'DRAFT',
  isReady: false,
  progress: 0,
  checks,
  blockingIssues: [],
});

const commercial = ONBOARDING_STEPS.find((s) => s.id === 'commerce')!;

describe('canLeaveStep — étape « Commercial »', () => {
  it('reste sur place tant que le compte de reversement manque', () => {
    const report = reportOf([
      check('commerce', false, true),
      check('payout', true, false),
    ]);

    expect(canLeaveStep(commercial, report)).toBe(false);
  });

  it('avance une fois le compte de reversement enregistré', () => {
    const report = reportOf([
      check('commerce', false, true),
      check('payout', true, true),
    ]);

    expect(canLeaveStep(commercial, report)).toBe(true);
  });

  it('une case facultative en défaut ne retient personne', () => {
    // Ne pas fixer de commission est un choix légitime : le taux plateforme
    // s'applique.
    const report = reportOf([
      check('commerce', false, false),
      check('payout', true, true),
    ]);

    expect(canLeaveStep(commercial, report)).toBe(true);
  });
});

describe('canLeaveStep — prudence', () => {
  it('une case absente du rapport compte comme non satisfaite', () => {
    const report = reportOf([check('commerce', false, true)]);

    expect(canLeaveStep(commercial, report)).toBe(false);
  });

  it('sans checklist chargée, on ne quitte pas une étape à cases', () => {
    expect(canLeaveStep(commercial, undefined)).toBe(false);
  });

  it('une étape sans case ne bloque jamais', () => {
    const review = ONBOARDING_STEPS.find((s) => s.id === 'review')!;

    expect(canLeaveStep(review, undefined)).toBe(true);
  });
});

describe('ONBOARDING_STEPS', () => {
  it('rattache la case bloquante `payout` à une étape', () => {
    // Sans rattachement, la checklist signale un manque que l'assistant ne
    // sait pas où corriger — c'est l'état dans lequel le web est resté.
    const keys = ONBOARDING_STEPS.flatMap((s) => [...s.checkKeys]);

    expect(keys).toContain('payout');
  });

  it('« Commercial » porte bien les deux formulaires', () => {
    expect(commercial.checkKeys).toContain('commerce');
    expect(commercial.checkKeys).toContain('payout');
  });
});

describe('stepState', () => {
  it('une case bloquante en défaut prime sur une facultative', () => {
    const report = reportOf([
      check('commerce', false, false),
      check('payout', true, false),
    ]);

    expect(stepState(commercial, report)).toBe('blocking');
  });

  it('une case facultative seule en défaut avertit sans bloquer', () => {
    const report = reportOf([
      check('commerce', false, false),
      check('payout', true, true),
    ]);

    expect(stepState(commercial, report)).toBe('warning');
  });

  it('tout coché vaut OK', () => {
    const report = reportOf([
      check('commerce', false, true),
      check('payout', true, true),
    ]);

    expect(stepState(commercial, report)).toBe('ok');
  });
});
