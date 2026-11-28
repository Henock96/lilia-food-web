import type { ReactNode } from 'react';
import Image from 'next/image';

export function AuthFormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid w-full max-w-5xl gap-5 md:grid-cols-2 md:gap-8">
      <div className="bg-cream-200 relative hidden overflow-hidden rounded-2xl md:block">
        <Image
          src="/auth-banani.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 500px, 50vw"
          className="object-cover"
        />
      </div>
      {children}
    </div>
  );
}
