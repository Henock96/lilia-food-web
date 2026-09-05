import type { OnboardingReport, ReadinessCheck } from '@lilia/types';

/**
 * Une étape de l'assistant de configuration vendeur, et les cases de la
 * checklist serveur qu'elle porte.
 *
 * `checkKeys` est ce qui permet d'afficher une pastille d'état et de décider
 * quand on peut avancer, sans jamais réimplémenter la règle côté client : le
 * serveur reste seul juge de ce qu'il accepte d'activer.
 */
export interface OnboardingStep {
  id: string;
  title: string;
  readonly checkKeys: readonly ReadinessCheck['key'][];
}

/**
 * Les huit étapes, dans l'ordre.
 *
 * ⚠️ « Commercial » porte **deux** formulaires : les paramètres commerciaux
 * (commission, minimum de commande) et le compte de reversement. C'est la seule
 * étape dans ce cas, et c'est celle qui impose la règle d'avance ci-dessous.
 *
 * `payout` a été ajoutée côté backend en septembre 2026 et n'avait jamais été
 * rattachée ici : la case était **bloquante**, aucun champ de l'assistant web
 * ne permettait de la remplir, et un vendeur configuré depuis le web restait
 * donc inactivable sans qu'aucun écran ne dise pourquoi ni où corriger.
 */
export const ONBOARDING_STEPS = [
  { id: 'identity', title: 'Identité', checkKeys: ['identity', 'description'] },
  { id: 'visuals', title: 'Visuels', checkKeys: ['logo', 'cover'] },
  { id: 'location', title: 'Localisation', checkKeys: ['location', 'gps'] },
  { id: 'hours', title: 'Horaires', checkKeys: ['hours'] },
  { id: 'delivery', title: 'Livraison', checkKeys: ['delivery'] },
  { id: 'commerce', title: 'Commercial', checkKeys: ['commerce', 'payout'] },
  { id: 'catalog', title: 'Catalogue', checkKeys: ['catalog'] },
  { id: 'review', title: 'Vérification', checkKeys: [] },
] as const satisfies readonly OnboardingStep[];

export type StepId = (typeof ONBOARDING_STEPS)[number]['id'];

/**
 * L'assistant peut-il quitter cette étape ?
 *
 * **Le défaut évité.** L'avance était inconditionnelle : chaque étape appelait
 * `onDone('suivante')` dès qu'un enregistrement réussissait. Le raccourci tient
 * tant qu'une étape porte un seul formulaire. Depuis que « Commercial » en
 * porte deux, enregistrer les paramètres commerciaux escamoterait le compte de
 * reversement — c'est exactement le symptôme constaté sur l'application Flutter
 * (« le champ s'affiche une fois puis disparaît »), et il aurait été reproduit
 * ici à l'identique.
 *
 * La règle suit la même autorité que le reste de l'écran, la checklist du
 * serveur : on ne quitte une étape que si plus aucune de ses cases
 * **bloquantes** n'est en défaut. Les cases facultatives (description,
 * couverture, paramètres commerciaux) ne retiennent personne — elles sont
 * signalées, jamais exigées.
 *
 * Une case absente du rapport compte comme **non satisfaite**. Un backend plus
 * ancien, ou une clé renommée, ne doit pas faire passer une étape pour
 * terminée : reparcourir une étape ne coûte rien, publier un vendeur qu'on ne
 * pourra jamais payer, si.
 */
export function canLeaveStep(
  step: OnboardingStep,
  report: OnboardingReport | undefined,
): boolean {
  if (step.checkKeys.length === 0) return true;
  if (!report) return false;
  return step.checkKeys.every((key) => {
    const check = report.checks.find((c) => c.key === key);
    if (!check) return false;
    return !check.blocking || check.status === 'OK';
  });
}

/** Pastille d'état de l'étape, dérivée des mêmes cases. */
export function stepState(
  step: OnboardingStep,
  report: OnboardingReport | undefined,
): 'ok' | 'warning' | 'blocking' | 'neutral' {
  if (step.checkKeys.length === 0) return 'neutral';
  const checks = step.checkKeys
    .map((key) => report?.checks.find((c) => c.key === key))
    .filter((c): c is ReadinessCheck => Boolean(c));
  if (checks.some((c) => c.blocking && c.status !== 'OK')) return 'blocking';
  if (checks.some((c) => c.status !== 'OK')) return 'warning';
  return 'ok';
}
