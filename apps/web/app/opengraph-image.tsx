import { ImageResponse } from 'next/og';

/**
 * Image de partage (Open Graph + Twitter card).
 *
 * Elle manquait complètement : le site déclarait `twitter:card:
 * summary_large_image` sans fournir d'image, donc tout partage — WhatsApp en
 * tête, qui est le canal de diffusion principal à Brazzaville — s'affichait
 * comme un lien nu. Générée ici plutôt qu'exportée en fichier pour rester
 * alignée sur la marque sans dépendre d'un asset binaire à maintenir.
 */
export const alt = 'Lilia Food — La marketplace gourmande de Brazzaville';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #D2371A 0%, #A72A12 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, letterSpacing: 6, opacity: 0.85 }}>
          BRAZZAVILLE · CONGO
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          Lilia Food
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 42,
            lineHeight: 1.3,
            maxWidth: 900,
            opacity: 0.95,
          }}
        >
          Restaurants, cuisines maison, boulangeries et boissons — livrés chez toi.
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 32, opacity: 0.8 }}>
          Paiement MTN MoMo et Airtel Money
        </div>
      </div>
    ),
    size,
  );
}
