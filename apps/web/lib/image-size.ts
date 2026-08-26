/**
 * Largeur minimale, en pixels, pour qu'une image serve de fond de hero en
 * plein écran. En dessous — ou si la largeur est inconnue — on bascule sur
 * l'aplat de couleur : mieux vaut un fond propre qu'une image pixelisée
 * agrandie sur un écran de bureau (1280 px et plus). Le doute profite à
 * l'aplat.
 */
export const HERO_MIN_WIDTH = 1200;

/**
 * Parse le segment SOF (Start Of Frame) d'un buffer JPEG pour en extraire
 * les dimensions, sans dépendance externe. Fonction pure, sans réseau : ne
 * lève jamais, rend `null` si les octets ne sont pas un JPEG reconnaissable
 * ou si le buffer est tronqué avant d'atteindre un marqueur SOF.
 */
export function parseJpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  // SOI (Start Of Image) : tout JPEG commence par 0xFFD8.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null; // position de marqueur invalide

    const marker = bytes[offset + 1];
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

    // Marqueurs SOFn porteurs de dimensions. On exclut 0xC4 (DHT), 0xC8
    // (JPG réservé) et 0xCC (DAC), qui partagent la plage 0xC0–0xCF sans
    // être des marqueurs SOF.
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isSOF) {
      // Segment SOF : [longueur(2)][précision(1)][hauteur(2)][largeur(2)]...
      if (offset + 9 > bytes.length) return null; // tronqué avant les dimensions
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    if (segmentLength < 2) return null; // segment incohérent, on s'arrête
    offset += 2 + segmentLength; // saute marqueur + segment jusqu'au suivant
  }

  return null; // aucun marqueur SOF trouvé dans les octets disponibles
}

/**
 * Récupère uniquement les premiers octets d'une image distante (assez pour
 * couvrir l'en-tête JPEG et ses segments de métadonnées habituels) et en
 * déduit la largeur. Ne doit jamais faire échouer l'appelant : réseau HS,
 * format non-JPEG, ou serveur qui ignore l'en-tête `Range` (répond 200 avec
 * le fichier entier au lieu d'un 206 partiel) retournent `null` plutôt que
 * de lever — dans ce dernier cas on s'arrête aussi pour ne pas télécharger
 * une image complète alors qu'on ne voulait lire que ses premiers octets.
 */
export async function fetchImageWidth(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-4095' } });
    if (res.status !== 206) return null;
    const buffer = new Uint8Array(await res.arrayBuffer());
    return parseJpegSize(buffer)?.width ?? null;
  } catch {
    return null;
  }
}
