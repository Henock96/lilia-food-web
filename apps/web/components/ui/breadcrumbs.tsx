import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs({
  links,
  current,
}: {
  links: { label: string; href: string }[];
  current: string;
}) {
  return (
    <nav aria-label="Fil d’Ariane" className="mb-5">
      <ol className="text-ink-500 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {links.map(({ href, label }) => (
          <li key={href} className="flex items-center gap-2">
            <Link href={href} className="hover:text-tomato-700 hover:underline">
              {label}
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
          </li>
        ))}
        <li aria-current="page" className="text-ink-900 font-semibold">
          {current}
        </li>
      </ol>
    </nav>
  );
}
