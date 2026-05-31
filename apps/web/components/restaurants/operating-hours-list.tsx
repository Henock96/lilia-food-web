'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { OperatingHours, DayOfWeek } from '@lilia/types';

interface OperatingHoursListProps {
  hours: OperatingHours[];
}

// Ordre Lundi → Dimanche (la semaine française démarre lundi).
const DAY_ORDER: DayOfWeek[] = [
  'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE',
];

const DAY_LABEL: Record<DayOfWeek, string> = {
  LUNDI: 'Lundi',
  MARDI: 'Mardi',
  MERCREDI: 'Mercredi',
  JEUDI: 'Jeudi',
  VENDREDI: 'Vendredi',
  SAMEDI: 'Samedi',
  DIMANCHE: 'Dimanche',
};

// JavaScript Date.getDay() : 0=Sunday, 1=Monday, ...
const JS_DAY_TO_ENUM: DayOfWeek[] = [
  'DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI',
];

function currentDayOfWeek(): DayOfWeek {
  return JS_DAY_TO_ENUM[new Date().getDay()]!;
}

function renderHours(h: OperatingHours): string {
  if (h.isClosed) return 'Fermé';
  return `${h.openTime} — ${h.closeTime}`;
}

export function OperatingHoursList({ hours }: OperatingHoursListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || hours.length === 0) return null;

  const today = currentDayOfWeek();
  const byDay = new Map<DayOfWeek, OperatingHours>();
  for (const h of hours) byDay.set(h.dayOfWeek, h);
  const todayHours = byDay.get(today);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="font-medium">
            {todayHours ? `Aujourd'hui : ${renderHours(todayHours)}` : "Horaires d'ouverture"}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex flex-col gap-1 overflow-hidden"
          >
            {DAY_ORDER.map((day) => {
              const h = byDay.get(day);
              const isToday = day === today;
              return (
                <li
                  key={day}
                  className={`flex justify-between text-sm ${
                    isToday
                      ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span>{DAY_LABEL[day]}</span>
                  <span>{h ? renderHours(h) : '—'}</span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
