'use client';

import { Star, Quote } from 'lucide-react';
import { HOME_TESTIMONIALS, type HomeTestimonial } from '@/lib/home-content';
import { SectionHeading } from './_ui';

export function Testimonials() {
  // dupliqué pour une boucle marquee fluide
  const loop = [...HOME_TESTIMONIALS, ...HOME_TESTIMONIALS];

  return (
    <section className="grain noir-canvas relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ils se régalent"
          title="Brazzaville"
          accent="en raffole."
          description="Des milliers de commandes livrées, et des clients qui en redemandent."
        />
      </div>

      <div className="marquee-mask relative mt-14 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
        <div className="marquee-track gap-5 px-4" style={{ '--marquee-duration': '48s' } as React.CSSProperties}>
          {loop.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }: { t: HomeTestimonial }) {
  return (
    <figure className="glass-noir flex w-[22rem] shrink-0 flex-col gap-4 rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <Quote className="h-7 w-7 text-[var(--ember-400)]/60" aria-hidden />
        <div className="flex items-center gap-0.5" aria-label={`${t.rating} sur 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <blockquote className="text-[15px] leading-relaxed text-white/80">“{t.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-2">
        <img src={t.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--ember-400)]/30" loading="lazy" />
        <div>
          <p className="text-sm font-semibold text-white">{t.name}</p>
          <p className="text-xs text-white/45">{t.area}</p>
        </div>
      </figcaption>
    </figure>
  );
}
