import { describe, expect, it } from 'vitest';
import { ADMIN_AUDIT_ACTIONS, AUDIT_ACTION_LABELS, auditActionLabel, settingsDiffLines } from './audit-labels';

describe('journal d’audit', () => {
  it('chaque action a un libellé (l’exhaustivité est garantie par le type Record)', () => {
    expect(ADMIN_AUDIT_ACTIONS).toHaveLength(30);
    for (const a of ADMIN_AUDIT_ACTIONS) expect(AUDIT_ACTION_LABELS[a]).toBeTruthy();
  });
  it('action inconnue : code brut plutôt que rien', () => {
    expect(auditActionLabel('NOUVELLE_ACTION')).toBe('NOUVELLE_ACTION');
  });
  it('diff de configuration lisible, vide/null rendus ∅', () => {
    expect(
      settingsDiffLines({
        minAppVersion: { before: null, after: '1.3.0' },
        maintenanceMessage: { before: '', after: 'Retour à 14 h' },
      }),
    ).toEqual(['minAppVersion : ∅ → 1.3.0', 'maintenanceMessage : ∅ → Retour à 14 h']);
  });
  it('métadonnées d’une autre forme : aucune ligne', () => {
    expect(settingsDiffLines({ amount: 500 })).toEqual([]);
    expect(settingsDiffLines(null)).toEqual([]);
  });
});
