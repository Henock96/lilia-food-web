import Link from 'next/link';
import type { ReorderResult } from '@lilia/api-client';
import { reorderFeedback } from '@/lib/reorder-feedback';

export function ReorderNotice({ result }: { result: ReorderResult }) {
  const feedback = reorderFeedback(result);
  if (feedback.kind === 'complete') return null;
  const issues = [
    ...result.details.unavailable.map(item => ({ ...item, fallback: 'Cet article n’est plus disponible.' })),
    ...result.details.errors.map(item => ({ ...item, fallback: 'L’ajout de cet article a échoué.' })),
  ];
  return (
    <div role="status" aria-live="polite" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{feedback.message}</p>
      {issues.length > 0 && <ul className="mt-2 list-disc pl-5">
        {issues.map((item, index) => <li key={index}>
          {item.productName ? `${item.productName} : ` : ''}{item.reason || item.fallback}
        </li>)}
      </ul>}
      <Link href="/panier" className="mt-2 inline-flex min-h-11 items-center underline font-semibold">Vérifier mon panier</Link>
    </div>
  );
}
