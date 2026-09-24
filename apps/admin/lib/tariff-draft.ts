import type { DeliveryTariff, DeliveryTariffDraftDto } from '@lilia/types';

/**
 * Formulaire d'un brouillon de grille (F3-02) : des chaînes, comme les champs.
 *
 * La conversion en DTO vit ici, hors du composant, pour être testée. Le
 * serveur revalide tout (DTO + `tariffDraftViolations`) : ce contrôle-ci
 * évite seulement d'envoyer un formulaire dont on sait déjà qu'il sera refusé,
 * et dit **quelle ligne** corriger.
 */
export interface TariffForm {
  roadFactor: string;
  bands: Array<{ maxKm: string; feeXaf: string }>;
  overrides: Array<{ originQuartierId: string; destQuartierId: string; feeXaf: string }>;
  note: string;
}

export const EMPTY_TARIFF_FORM: TariffForm = {
  roadFactor: '1.3',
  bands: [{ maxKm: '', feeXaf: '' }],
  overrides: [],
  note: '',
};

/** Pré-remplit l'éditeur depuis une version existante (modifier ou dupliquer). */
export function formFromTariff(tariff: DeliveryTariff): TariffForm {
  return {
    roadFactor: String(tariff.roadFactor),
    bands: [...tariff.bands]
      .sort((a, b) => a.maxKm - b.maxKm)
      .map((b) => ({ maxKm: String(b.maxKm), feeXaf: String(b.feeXaf) })),
    overrides: tariff.overrides.map((o) => ({
      originQuartierId: o.originQuartierId,
      destQuartierId: o.destQuartierId,
      feeXaf: String(o.feeXaf),
    })),
    note: tariff.note ?? '',
  };
}

const MAX_FEE_XAF = 50_000;

function parseFee(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= MAX_FEE_XAF ? n : null;
}

export function tariffFormToDto(
  form: TariffForm,
): { dto: DeliveryTariffDraftDto; errors: [] } | { dto: null; errors: string[] } {
  const errors: string[] = [];

  const roadFactor = Number(form.roadFactor.replace(',', '.'));
  if (!(roadFactor >= 1 && roadFactor <= 3)) {
    errors.push('Le coefficient routier doit être compris entre 1 et 3.');
  }

  const bands: DeliveryTariffDraftDto['bands'] = [];
  const seenKm = new Set<number>();
  form.bands.forEach((row, i) => {
    const maxKm = Number(row.maxKm.replace(',', '.'));
    const feeXaf = parseFee(row.feeXaf);
    if (!(maxKm >= 0.1 && maxKm <= 100) || Math.round(maxKm * 10) !== maxKm * 10) {
      errors.push(`Tranche ${i + 1} : distance entre 0,1 et 100 km, au dixième près.`);
      return;
    }
    if (feeXaf === null) {
      errors.push(`Tranche ${i + 1} : prix entier entre 0 et ${MAX_FEE_XAF} FCFA.`);
      return;
    }
    if (seenKm.has(maxKm)) {
      errors.push(`Deux tranches s'arrêtent à ${maxKm} km : le prix serait ambigu.`);
      return;
    }
    seenKm.add(maxKm);
    bands.push({ maxKm, feeXaf });
  });
  if (form.bands.length === 0) errors.push('Une grille compte au moins une tranche.');

  const overrides: NonNullable<DeliveryTariffDraftDto['overrides']> = [];
  const seenPairs = new Set<string>();
  form.overrides.forEach((row, i) => {
    const feeXaf = parseFee(row.feeXaf);
    if (!row.originQuartierId || !row.destQuartierId) {
      errors.push(`Prix fixe ${i + 1} : choisissez les deux quartiers.`);
      return;
    }
    if (feeXaf === null) {
      errors.push(`Prix fixe ${i + 1} : prix entier entre 0 et ${MAX_FEE_XAF} FCFA.`);
      return;
    }
    const pair = `${row.originQuartierId}→${row.destQuartierId}`;
    if (seenPairs.has(pair)) {
      errors.push(`Prix fixe ${i + 1} : ce trajet a déjà un prix.`);
      return;
    }
    seenPairs.add(pair);
    overrides.push({
      originQuartierId: row.originQuartierId,
      destQuartierId: row.destQuartierId,
      feeXaf,
    });
  });

  if (errors.length) return { dto: null, errors };
  return {
    dto: {
      roadFactor,
      bands: bands.sort((a, b) => a.maxKm - b.maxKm),
      overrides,
      note: form.note.trim() || null,
    },
    errors: [],
  };
}
