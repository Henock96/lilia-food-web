import { describe, expect, it } from 'vitest';
import { DEFAULT_MAINTENANCE_MESSAGE, maintenanceNotice } from './maintenance';

describe('maintenanceNotice (MAINT-001)', () => {
  it('hors maintenance : rien', () => {
    expect(maintenanceNotice({ maintenanceMode: false, maintenanceMessage: 'x' })).toBeNull();
  });
  it('réglages inconnus : rien — on ne déclare pas une maintenance non lue', () => {
    expect(maintenanceNotice(undefined)).toBeNull();
  });
  it('maintenance avec message : le message de l’administrateur', () => {
    expect(maintenanceNotice({ maintenanceMode: true, maintenanceMessage: 'Retour à 14 h' })).toBe(
      'Retour à 14 h',
    );
  });
  it.each([null, '', '   '])('maintenance, message %p : texte par défaut', (m) => {
    expect(maintenanceNotice({ maintenanceMode: true, maintenanceMessage: m })).toBe(
      DEFAULT_MAINTENANCE_MESSAGE,
    );
  });
});
