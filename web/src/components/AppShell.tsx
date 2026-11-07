'use client';
import Link from 'next/link';
import { useI18n } from './I18nProvider';

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-xl tracking-tight text-[var(--ink)] min-h-11 flex items-center">
          {t.brand}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-11 min-w-11 px-3 rounded-lg border border-[var(--line)] text-sm"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            aria-label={t.language}
          >
            {locale === 'th' ? 'EN' : 'TH'}
          </button>
          <Link href="/settings" className="min-h-11 px-3 flex items-center text-sm text-[var(--muted)]">
            {t.settings}
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {title ? <h1 className="font-display text-2xl mb-4 text-[var(--ink)]">{title}</h1> : null}
        {children}
      </main>
      <p className="text-center text-xs text-[var(--muted)] px-4 pb-6 max-w-lg mx-auto">{t.disclaimer}</p>
    </div>
  );
}
