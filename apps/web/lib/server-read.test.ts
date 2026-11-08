import { describe, expect, it, vi } from 'vitest';
import { reportServerReadFailure, SERVER_READ_TIMEOUT_MS, serverReadSignal } from './server-read';

describe('reportServerReadFailure', () => {
  it('nomme la lecture et la nature de l’échec', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportServerReadFailure('carte v1', new DOMException('aborted due to timeout', 'TimeoutError'));
    expect(warn).toHaveBeenCalledWith('[lecture serveur] carte v1 — TimeoutError : aborted due to timeout');
    warn.mockRestore();
  });

  it('accepte une valeur levée qui n’est pas une Error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportServerReadFailure('bannières', 'boom');
    expect(warn).toHaveBeenCalledWith('[lecture serveur] bannières — boom');
    warn.mockRestore();
  });
});

describe('serverReadSignal', () => {
  it('borne une lecture serveur à 10 s', () => {
    expect(SERVER_READ_TIMEOUT_MS).toBe(10_000);
  });

  it('n’est pas interrompu à la création', () => {
    expect(serverReadSignal().aborted).toBe(false);
  });

  it('interrompt la lecture une fois le délai dépassé', async () => {
    const signal = serverReadSignal(5);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe('TimeoutError');
  });
});
