import type { Metadata } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { LegalPage } from '@/components/legal/legal-page';

// Cette page reprend le contenu déjà publié sur /confidentialite et
// /conditions. Elle est conservée parce qu'elle sert de destination aux
// stores et aux SDK tiers, mais elle est passée en `noindex` : trois URLs
// portant le même texte se cannibalisent dans l'index de Google.
export const metadata: Metadata = {
  title: 'Politique de Confidentialité & CGU',
  description:
    "Politique de confidentialité et conditions générales d'utilisation de Lilia Food.",
  alternates: { canonical: '/privacy-policy-cgu' },
  robots: { index: false, follow: true },
};

export default async function PrivacyPolicyCguPage() {
  const raw = await fs.readFile(
    path.join(process.cwd(), 'content/legal/privacy-policy-cgu.md'),
    'utf-8',
  );

  const { content } = await compileMDX({
    source: raw,
    options: { mdxOptions: { remarkPlugins: [] } },
  });

  return (
    <LegalPage title="Politique de Confidentialité & CGU" lastUpdated="2026-05-19">
      {content}
    </LegalPage>
  );
}
