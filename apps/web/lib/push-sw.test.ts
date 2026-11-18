import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const web = readFileSync(resolve(__dirname, '../public/push-sw.js'), 'utf8');
const admin = readFileSync(resolve(__dirname, '../../admin/public/push-sw.js'), 'utf8');

describe('push-sw.js', () => {
  it('is the same file on the client site and the administration', () => {
    expect(admin).toBe(web);
  });

  it('carries no navigation rule of its own', () => {
    // Les routes vivent dans lib/push-routes.ts de chaque site.
    expect(web).not.toMatch(/['"]\/(commandes|profil|incidents|vendeurs|dashboard)/);
    expect(web).toContain("'/notifications/ouvrir?'");
  });

  it('does not load remote code', () => {
    expect(web).not.toMatch(/importScripts|gstatic/);
  });
});
