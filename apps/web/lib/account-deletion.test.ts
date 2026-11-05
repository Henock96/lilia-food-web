import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@lilia/api-client';
import { runAccountDeletion } from './account-deletion';

const setup = (remove: () => Promise<void>, logout: () => Promise<boolean> = async () => true) => {
  const calls = { logout: vi.fn(logout), onDeleted: vi.fn(), onRefused: vi.fn() };
  return { ...calls, run: () => runAccountDeletion({ remove, ...calls }) };
};

describe('runAccountDeletion', () => {
  it('compte supprimé : la session est fermée, puis le client est prévenu', async () => {
    const s = setup(async () => {});
    await s.run();
    expect(s.logout).toHaveBeenCalledOnce();
    expect(s.onDeleted).toHaveBeenCalledOnce();
    expect(s.onRefused).not.toHaveBeenCalled();
    expect(s.logout.mock.invocationCallOrder[0]).toBeLessThan(s.onDeleted.mock.invocationCallOrder[0]);
  });

  it('409 commande en cours : le client reste connecté et lit le motif du serveur', async () => {
    const message = 'Vous avez 1 commande(s) en cours.';
    const s = setup(async () => {
      throw new ApiError(409, message);
    });
    await s.run();
    expect(s.logout).not.toHaveBeenCalled();
    expect(s.onDeleted).not.toHaveBeenCalled();
    expect(s.onRefused).toHaveBeenCalledWith(message);
  });

  it('réseau coupé : rien n’est annoncé comme supprimé', async () => {
    const s = setup(async () => {
      throw new TypeError('fetch failed');
    });
    await s.run();
    expect(s.logout).not.toHaveBeenCalled();
    expect(s.onDeleted).not.toHaveBeenCalled();
    expect(s.onRefused).toHaveBeenCalledWith(
      'Suppression impossible. Vérifiez votre connexion puis réessayez.',
    );
  });

  it.each([
    ['échoue', async () => false],
    ['lève', async () => { throw new Error('signOut'); }],
  ])('compte supprimé mais la déconnexion %s : le compte reste annoncé supprimé', async (_label, logout) => {
    const s = setup(async () => {}, logout);
    await s.run();
    expect(s.onDeleted).toHaveBeenCalledOnce();
    expect(s.onRefused).not.toHaveBeenCalled();
  });
});
