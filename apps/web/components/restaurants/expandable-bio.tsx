'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableBioProps {
  story: string;
  /** Au-dessus de ce nombre de caractères, on tronque + bouton "Lire plus". */
  collapseThreshold?: number;
}

const DEFAULT_THRESHOLD = 220;

export function ExpandableBio({ story, collapseThreshold = DEFAULT_THRESHOLD }: ExpandableBioProps) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = story.length > collapseThreshold;
  const displayed = !needsToggle || expanded
    ? story
    : story.slice(0, collapseThreshold).trimEnd() + '…';

  return (
    <div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
        {displayed}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
        >
          {expanded ? (
            <>Réduire <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Lire plus <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
