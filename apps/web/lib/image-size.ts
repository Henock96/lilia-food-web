/**
 * Largeur minimale, en pixels, pour qu'une image serve de fond de hero en
 * plein écran. En dessous — ou si la largeur est inconnue — on bascule sur
 * l'aplat de couleur : mieux vaut un fond propre qu'une image pixelisée
 * agrandie sur un écran de bureau (1280 px et plus). Le doute profite à
 * l'aplat.
 */
export const HERO_MIN_WIDTH = 1200;

/**
 * Nombre d'octets récupérés en tête de fichier pour y chercher les
 * dimensions. Une photo d'appareil porte souvent un profil ICC ou un bloc
 * EXIF volumineux qui repousse le marqueur SOF (JPEG) ou le premier chunk
 * utile (PNG/WebP) loin au-delà de quelques kilo-octets — 64 Ko couvre
 * largement ces cas sans télécharger l'image entière.
 */
const HEADER_BYTES = 65536;

/** Délai maximal d'une requête de mesure. Cette image est servie par un
 *  hôte tiers que nous ne maîtrisons pas (ex. `sogood.paris`) : un serveur
 *  lent ne doit jamais retarder le prérendu de la page au-delà de
 *  quelques secondes. Le timeout par défaut du client HTTP (~300 s) est
 *  bien trop long pour cet usage. */
const FETCH_TIMEOUT_MS = 2000;

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Parse le segment SOF (Start Of Frame) d'un buffer JPEG pour en extraire
 * les dimensions, sans dépendance externe. Fonction pure, sans réseau : ne
 * lève jamais, rend `null` si les octets ne sont pas un JPEG reconnaissable
 * ou si le buffer est tronqué avant d'atteindre un marqueur SOF.
 *
 * Gère les marqueurs autonomes sans champ de longueur (TEM `0x01`, RSTn
 * `0xD0`–`0xD7`, SOI/EOI `0xD8`/`0xD9`) et les octets de bourrage `0xFF`
 * qui peuvent précéder un marqueur — sans jamais boucler indéfiniment ni
 * lire hors limites : `offset` progresse strictement à chaque itération.
 */
export function parseJpegSize(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null; // SOI manquant

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null; // position de marqueur invalide

    // Des 0xFF de bourrage peuvent se répéter avant le vrai code marqueur.
    let markerPos = offset + 1;
    while (markerPos < bytes.length && bytes[markerPos] === 0xff) markerPos++;
    if (markerPos >= bytes.length) return null;
    const marker = bytes[markerPos];

    // Marqueurs sans segment : TEM (0x01), RSTn/SOI/EOI (0xD0–0xD9).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset = markerPos + 1;
      continue;
    }

    // Marqueurs SOFn porteurs de dimensions. On exclut 0xC4 (DHT), 0xC8
    // (JPG réservé) et 0xCC (DAC), qui partagent la plage 0xC0–0xCF sans
    // être des marqueurs SOF.
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    const lengthPos = markerPos + 1;
    if (lengthPos + 2 > bytes.length) return null;
    const segmentLength = (bytes[lengthPos] << 8) | bytes[lengthPos + 1];

    if (isSOF) {
      // Segment SOF : [longueur(2)][précision(1)][hauteur(2)][largeur(2)]...
      const dimsPos = lengthPos + 2;
      if (dimsPos + 5 > bytes.length) return null; // tronqué avant les dimensions
      const height = (bytes[dimsPos + 1] << 8) | bytes[dimsPos + 2];
      const width = (bytes[dimsPos + 3] << 8) | bytes[dimsPos + 4];
      if (width <= 0 || height <= 0) return null;
      return { width, height };
    }

    if (segmentLength < 2) return null; // segment incohérent, on s'arrête
    offset = lengthPos + segmentLength; // saute marqueur + segment jusqu'au suivant
  }

  return null; // aucun marqueur SOF trouvé dans les octets disponibles
}

/**
 * Lit le chunk IHDR (toujours le premier après la signature) d'un buffer
 * PNG. Fonction pure : ne lève jamais, rend `null` si la signature ou le
 * chunk IHDR sont absents ou tronqués.
 */
export function parsePngSize(bytes: Uint8Array): ImageDimensions | null {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) return null;
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (bytes[i] !== SIGNATURE[i]) return null;
  }
  // bytes[8..11] = longueur du chunk (13 pour IHDR) ; bytes[12..15] = type "IHDR".
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/**
 * Lit les dimensions d'un buffer WebP, dans ses trois variantes de chunk
 * possibles juste après l'en-tête RIFF/WEBP : `VP8 ` (lossy), `VP8L`
 * (lossless), `VP8X` (extended, contenant le canevas). Fonction pure : ne
 * lève jamais, rend `null` pour un en-tête absent, tronqué ou un chunk
 * inconnu.
 */
export function parseWebpSize(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 20) return null;
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isRiff || !isWebp) return null;

  const fourCC = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  const dataStart = 20; // 12 (RIFF+taille+WEBP) + 4 (fourCC chunk) + 4 (taille chunk)

  if (fourCC === 'VP8 ') {
    // [tag de trame(3)][code de démarrage 0x9D 0x01 0x2A(3)][largeur LE 14 bits][hauteur LE 14 bits]
    if (bytes.length < dataStart + 10) return null;
    const width = (bytes[dataStart + 6] | (bytes[dataStart + 7] << 8)) & 0x3fff;
    const height = (bytes[dataStart + 8] | (bytes[dataStart + 9] << 8)) & 0x3fff;
    if (width <= 0 || height <= 0) return null;
    return { width, height };
  }

  if (fourCC === 'VP8L') {
    // [signature 0x2F(1)][largeur-1 (14 bits) | hauteur-1 (14 bits) | alpha | version, LE 32 bits]
    if (bytes.length < dataStart + 5 || bytes[dataStart] !== 0x2f) return null;
    const bits =
      (bytes[dataStart + 1] |
        (bytes[dataStart + 2] << 8) |
        (bytes[dataStart + 3] << 16) |
        (bytes[dataStart + 4] << 24)) >>>
      0;
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >>> 14) & 0x3fff) + 1;
    return { width, height };
  }

  if (fourCC === 'VP8X') {
    // [drapeaux(1)][réservé(3)][largeur canevas-1 LE 24 bits][hauteur canevas-1 LE 24 bits]
    if (bytes.length < dataStart + 10) return null;
    const width =
      (bytes[dataStart + 4] | (bytes[dataStart + 5] << 8) | (bytes[dataStart + 6] << 16)) + 1;
    const height =
      (bytes[dataStart + 7] | (bytes[dataStart + 8] << 8) | (bytes[dataStart + 9] << 16)) + 1;
    return { width, height };
  }

  return null; // conteneur WebP reconnu, chunk d'image non reconnu
}

/**
 * Point d'entrée générique : reconnaît le format à ses octets de signature
 * (JPEG, PNG, WebP — les trois formats acceptés à l'upload par le
 * backend) et délègue au parseur correspondant. Rend `null` pour tout
 * format inconnu, sans jamais lever.
 */
export function parseImageSize(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpegSize(bytes);
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return parsePngSize(bytes);
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49) {
    return parseWebpSize(bytes);
  }
  return null;
}

/**
 * Récupère uniquement les premiers octets d'une image distante (voir
 * {@link HEADER_BYTES}) et en déduit la largeur, quel que soit le format
 * (JPEG/PNG/WebP). Ne doit jamais faire échouer l'appelant : réseau HS,
 * lenteur du serveur distant, format non reconnu, ou serveur qui ignore
 * l'en-tête `Range` (répond 200 avec le fichier entier au lieu d'un 206
 * partiel) retournent tous `null` plutôt que de lever.
 *
 * Deux protections spécifiques :
 * - `AbortSignal.timeout` borne l'attente réseau à {@link FETCH_TIMEOUT_MS} :
 *   un hôte tiers lent (l'image de l'unique vendeur de production est
 *   servie par `sogood.paris`) ne doit jamais retarder le prérendu.
 * - le corps de la réponse est explicitement drainé (`res.body?.cancel()`)
 *   quand on ne le lit pas, pour ne pas laisser un transfert continuer en
 *   arrière-plan sur un serveur qui ignore `Range`.
 */
export async function fetchImageWidth(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${HEADER_BYTES - 1}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status !== 206) {
      await res.body?.cancel();
      return null;
    }
    const buffer = new Uint8Array(await res.arrayBuffer());
    return parseImageSize(buffer)?.width ?? null;
  } catch {
    return null;
  }
}
