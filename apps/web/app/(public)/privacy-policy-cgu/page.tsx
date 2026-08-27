import type { Metadata } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité & CGU | Lilia Food',
  description:
    'Politique de confidentialité et conditions générales dutilisation de Lilia Food.',
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
