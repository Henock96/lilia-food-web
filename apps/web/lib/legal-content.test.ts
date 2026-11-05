import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Les documents légaux **servis** (`/conditions`, `/confidentialite`).
 *
 * Ils annonçaient 8 % de frais de service, « 1 point = 5 XAF » et un minimum de
 * 100 points quand la production facturait 15 %, valait 50 XAF le point et en
 * acceptait un seul : ces valeurs vivent dans `PlatformSettings` et changent
 * sans déploiement du site. Les CGU décrivent donc le principe et renvoient au
 * récapitulatif de commande, sans chiffre qui se périme. Elles publiaient aussi
 * les notes de travail destinées à l'équipe (« À faire valider par un
 * avocat… »).
 */
const SERVED = ['conditions-generales-utilisation.md', 'politique-de-confidentialite.md'];

function read(file: string): string {
  return readFileSync(path.join(__dirname, '..', 'content', 'legal', file), 'utf8');
}

describe.each(SERVED)('%s', (file) => {
  const text = read(file);

  it.each([
    ['taux de frais de service', /\d+\s?% du sous-total/i],
    ['valeur du point en XAF', /1 point = \d+/i],
    ['seuil d’utilisation des points', /minimum \d+ points/i],
    ['barème d’acquisition', /tranche de \d+ XAF/i],
    ['bonus de parrainage chiffré', /\+\s?\d+ points/i],
  ])('ne chiffre pas une valeur pilotée par les réglages : %s', (_label, pattern) => {
    expect(text).not.toMatch(pattern);
  });

  // « valider … avocat » vise la note de travail, pas la mention légitime des
  // avocats parmi les destinataires des données (politique, § partage).
  it.each([/valider (avec|par) un avocat/i, /Document généré/i])('ne publie pas de note de travail (%s)', (pattern) => {
    expect(text).not.toMatch(pattern);
  });
});
