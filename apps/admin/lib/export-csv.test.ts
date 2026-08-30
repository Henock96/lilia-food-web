import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { exportToCsv } from './export-csv';

/**
 * `exportToCsv` déclenche un téléchargement navigateur. On remplace les API
 * du DOM impliquées pour récupérer le contenu réellement écrit dans le
 * fichier, qui est ce que l'on veut tester.
 */
let captured = '';

beforeEach(() => {
  captured = '';
  vi.stubGlobal(
    'Blob',
    class {
      constructor(parts: string[]) {
        captured = parts.join('');
      }
    },
  );
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:test',
    revokeObjectURL: () => {},
  });
  vi.stubGlobal('document', {
    createElement: () => ({ href: '', download: '', click: () => {} }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Retourne les cellules de la ligne de données (hors en-têtes et BOM). */
function dataRow(): string {
  return captured.replace('﻿', '').split('\n')[1]!;
}

describe('exportToCsv — injection de formule', () => {
  // Les noms de clients et adresses de livraison sont saisis par des
  // utilisateurs externes, puis exportés et ouverts dans Excel par un
  // administrateur : une formule non neutralisée s'exécute sur son poste.
  it.each([
    ['=HYPERLINK("http://evil.com","Facture")', 'HYPERLINK exfiltrant des données'],
    ["=cmd|'/c calc'!A1", 'exécution de commande'],
    ['+1+1', 'préfixe +'],
    ['-1+1', 'préfixe -'],
    ['@SUM(A1)', 'préfixe @'],
    ['\t=1+1', 'contournement par tabulation'],
    ['\r=1+1', 'contournement par retour chariot'],
  ])('neutralise %j (%s)', (payload) => {
    exportToCsv('test.csv', [{ Nom: payload }]);
    const cell = dataRow();
    // La cellule ne doit jamais commencer par un caractère de formule, que
    // le champ soit entouré de guillemets ou non.
    expect(cell.replace(/^"/, '')).toMatch(/^'/);
  });

  it('laisse les valeurs normales intactes', () => {
    exportToCsv('test.csv', [{ Nom: 'Jean Dupont' }]);
    expect(dataRow()).toBe('Jean Dupont');
  });

  it("échappe toujours les virgules et guillemets selon la RFC 4180", () => {
    exportToCsv('test.csv', [{ Adresse: '15, Rue "Banziris"' }]);
    expect(dataRow()).toBe('"15, Rue ""Banziris"""');
  });

  it('neutralise aussi les en-têtes', () => {
    exportToCsv('test.csv', [{ '=danger': 'x' }]);
    expect(captured.replace('﻿', '').split('\n')[0]).toBe("'=danger");
  });

  it('ne produit aucun fichier sans données', () => {
    exportToCsv('test.csv', []);
    expect(captured).toBe('');
  });
});
