import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg-app px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-2xl bg-brand-soft text-brand-strong flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-brand-strong">NutriSoft</p>
            <p className="text-[11px] text-text-secondary">Acceso seguro</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm leading-5 text-text-secondary">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
