/**
 * Règles du canal de mise à jour du parc mobile — **UX seulement**.
 *
 * L'autorité est le backend (`lilia-backend/…/platform-settings/app-update-policy.ts`) :
 * il refuse toute configuration incohérente, quelle que soit l'interface qui
 * l'envoie. Ce fichier existe pour montrer l'erreur **avant** l'aller-retour,
 * et reprend à l'identique la grammaire, les cas et les messages de :
 *
 * - `app-update-policy.ts` (backend) ;
 * - `app_update_rules.dart` (Admin Flutter) ;
 * - `app_version.dart` (lilia-app, qui applique réellement le seuil).
 *
 * Les tests (`app-update-rules.test.ts`) reprennent les **mêmes vecteurs** que
 * les trois autres : si un verdict change ici, il doit changer partout.
 */

export interface AppVersion {
  major: number;
  minor: number;
  patch: number;
  /** `null` = build **absent**, pas build zéro. */
  build: number | null;
}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:\+(\d+))?$/;

/**
 * Parse une saisie d'administrateur. Tolère espaces et « v » initial (retirés
 * ensuite par [normalizeVersion]) ; `1.2` rend `null`, jamais `1.2.0`.
 */
export function parseAppVersion(input: string | null | undefined): AppVersion | null {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (s === '') return null;
  if (s.startsWith('v') || s.startsWith('V')) s = s.slice(1);
  const m = VERSION_PATTERN.exec(s);
  if (!m) return null;
  const [major, minor, patch] = [m[1], m[2], m[3]].map(Number);
  const build = m[4] === undefined ? null : Number(m[4]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;
  if (build !== null && !Number.isSafeInteger(build)) return null;
  return { major, minor, patch, build };
}

/** Majeure, mineure, correctif **numériquement**, puis build si les deux en ont un. */
export function compareAppVersions(a: AppVersion, b: AppVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.build === null || b.build === null) return 0;
  return a.build - b.build;
}

export function formatAppVersion(v: AppVersion): string {
  const core = `${v.major}.${v.minor}.${v.patch}`;
  return v.build === null ? core : `${core}+${v.build}`;
}

/**
 * Forme canonique à envoyer : `v1.3.0 ` → `1.3.0`, vide → `null`. Une saisie
 * illisible est renvoyée telle quelle (trimée) : le serveur la refusera avec
 * son message, plutôt qu'un effacement silencieux.
 */
export function normalizeVersion(raw: string): string | null {
  const t = raw.trim();
  if (t === '') return null;
  const parsed = parseAppVersion(t);
  return parsed ? formatAppVersion(parsed) : t;
}

// ── Destinations de store (miroir de app-update-policy.ts) ────────────────

export const ANDROID_APPLICATION_ID = 'com.dreesis.lilia.lilia_app';
const PLACEHOLDER_APP_STORE_IDS = new Set(['6740000000', '000000000']);

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isAllowedAndroidStoreUrl(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url || url.username || url.password || url.port) return false;
  if (url.searchParams.get('id') !== ANDROID_APPLICATION_ID) return false;
  if (url.protocol === 'https:') {
    return url.hostname === 'play.google.com' && url.pathname === '/store/apps/details';
  }
  if (url.protocol === 'market:') {
    return url.hostname === 'details' && (url.pathname === '' || url.pathname === '/');
  }
  return false;
}

export function isAllowedIosStoreUrl(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url || url.username || url.password || url.port) return false;
  const hostOk =
    (url.protocol === 'https:' && url.hostname === 'apps.apple.com') ||
    (url.protocol === 'itms-apps:' &&
      (url.hostname === 'apps.apple.com' || url.hostname === 'itunes.apple.com'));
  if (!hostOk) return false;
  const m = /^\/(?:[a-z]{2}\/)?app\/(?:[^/]+\/)?id(\d{9,10})\/?$/.exec(url.pathname);
  return !!m && !PLACEHOLDER_APP_STORE_IDS.has(m[1]);
}

// ── Validation d'une saisie ───────────────────────────────────────────────

const FORMAT_ATTENDU = 'au format 1.3.0 ou 1.3.0+34';

export const ANDROID_URL_MESSAGE =
  `L'URL Android doit être la fiche Google Play de Lilia Food ` +
  `(https://play.google.com/store/apps/details?id=${ANDROID_APPLICATION_ID}).`;
export const IOS_URL_MESSAGE =
  "L'URL iOS doit être une fiche App Store (https://apps.apple.com/app/…/id…), " +
  "pas une recherche ni un identifiant de gabarit.";

export interface AppUpdateInput {
  minVersion: string;
  latestVersion: string;
  urlAndroid: string;
  urlIos: string;
}

/** Quels champs le PATCH touche — seuls ceux-là sont jugés, comme au serveur. */
export interface AppUpdateTouched {
  versions: boolean;
  urlAndroid: boolean;
  urlIos: boolean;
}

/**
 * Refus prêts à afficher. Liste vide = saisie acceptable.
 *
 * Comme le serveur, les invariants de version ne sont jugés que si le PATCH
 * touche une version : un état hérité ne doit pas empêcher de corriger les
 * frais de service en urgence.
 */
export function validateAppUpdate(
  input: AppUpdateInput,
  touched: AppUpdateTouched = { versions: true, urlAndroid: true, urlIos: true },
): string[] {
  const refus: string[] = [];

  if (touched.versions) {
    const min = input.minVersion.trim();
    const latest = input.latestVersion.trim();
    const minParsed = min ? parseAppVersion(min) : null;
    const latestParsed = latest ? parseAppVersion(latest) : null;

    if (min && !minParsed) refus.push(`La version minimale doit être ${FORMAT_ATTENDU}.`);
    if (latest && !latestParsed) {
      refus.push(`La dernière version publiée doit être ${FORMAT_ATTENDU}.`);
    }
    if (minParsed && !latest) {
      refus.push(
        "Renseignez d'abord la dernière version publiée : sans elle, " +
          'impossible de vérifier que le blocage est installable.',
      );
    }
    if (minParsed && latestParsed) {
      if (minParsed.build !== null && latestParsed.build === null) {
        refus.push(
          'Impossible de vérifier que le blocage est installable : la version ' +
            `minimale exige un build (${formatAppVersion(minParsed)}) alors que la ` +
            `dernière version publiée n'en déclare aucun (${formatAppVersion(latestParsed)}).`,
        );
      } else if (compareAppVersions(minParsed, latestParsed) > 0) {
        refus.push(
          'Vous exigeriez une version que personne ne peut installer : la version ' +
            `minimale (${formatAppVersion(minParsed)}) dépasse la dernière version ` +
            `publiée (${formatAppVersion(latestParsed)}).`,
        );
      }
    }
  }

  if (touched.urlAndroid) {
    const u = input.urlAndroid.trim();
    if (u && !isAllowedAndroidStoreUrl(u)) refus.push(ANDROID_URL_MESSAGE);
  }
  if (touched.urlIos) {
    const u = input.urlIos.trim();
    if (u && !isAllowedIosStoreUrl(u)) refus.push(IOS_URL_MESSAGE);
  }

  return refus;
}

/**
 * Faut-il exiger « BLOQUER » ? Seulement pour **poser ou modifier** un
 * blocage. Le lever, ou ne pas y toucher, n'en demande pas : l'obstacle doit
 * être sur le chemin qui casse, jamais sur celui qui répare.
 */
export function requiresBlockConfirmation(
  minVersion: string,
  savedMinVersion: string | null,
): boolean {
  const next = normalizeVersion(minVersion);
  if (next === null) return false;
  return next !== (savedMinVersion ?? null);
}

export const BLOCK_CONFIRMATION_WORD = 'BLOQUER';
