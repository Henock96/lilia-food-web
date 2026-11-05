import { describe, expect, it } from 'vitest';

import { deleteAccountRequest } from './profile';

describe('deleteAccountRequest', () => {
  it('supprime le compte de l’appelant : aucun identifiant ne part dans la requête', async () => {
    const calls: { path: string; method?: string; token?: unknown; body?: unknown }[] = [];
    await deleteAccountRequest('synthetic', async (path, options) => {
      calls.push({ path, method: options?.method, token: options?.token, body: options?.body });
      return undefined as never;
    });
    expect(calls).toEqual([{ path: '/users/me', method: 'DELETE', token: 'synthetic', body: undefined }]);
  });
});
