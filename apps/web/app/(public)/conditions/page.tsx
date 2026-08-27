import type { Metadata } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Lilia Food",
  description:
    "Consultez les conditions générales d'utilisation de la plateforme Lilia Food.",
};

export default async function ConditionsPage() {
  const raw = await fs.readFile(
    path.join(process.cwd(), 'content/legal/conditions-generales-utilisation.md'),
    'utf-8',
  );

  const { content } = await compileMDX({
    source: raw,
    options: { mdxOptions: { remarkPlugins: [] } },
  });

  return (
    <LegalPage title="Conditions Générales d'Utilisation" lastUpdated="2026-08-27">
      {content}
    </LegalPage>
  );
}
