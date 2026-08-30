import type { Metadata } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { LegalPage } from '@/components/legal/legal-page';

// Pas de suffixe « | Lilia Food » : le template du layout racine l'ajoute.
export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description:
    'Découvrez comment Lilia Food collecte, utilise et protège vos données personnelles.',
  alternates: { canonical: '/confidentialite' },
};

export default async function ConfidentialitePage() {
  const raw = await fs.readFile(
    path.join(process.cwd(), 'content/legal/politique-de-confidentialite.md'),
    'utf-8',
  );

  const { content } = await compileMDX({
    source: raw,
    options: { mdxOptions: { remarkPlugins: [] } },
  });

  return (
    <LegalPage title="Politique de Confidentialité" lastUpdated="2026-08-27">
      {content}
    </LegalPage>
  );
}
