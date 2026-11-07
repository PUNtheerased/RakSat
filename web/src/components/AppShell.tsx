'use client';
import Link from 'next/link';
import { Languages, UserRound } from 'lucide-react';
import { Logo } from './Logo';
import { useI18n } from './I18nProvider';

export function AppShell({
  children,
  title,
  subtitle,
  homeHref = '/app',
  showDisclaimer = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  homeHref?: string;
  showDisclaimer?: boolean;
}) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <Logo href={homeHref} showTag={false} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="min-h-11 min-w-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)]"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              aria-label={t.language}
            >
              <Languages size={15} aria-hidden />
              {locale === 'th' ? 'EN' : 'TH'}
            </button>
            <Link
              href="/settings"
              aria-label={t.settings}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--forest)]"
            >
              <UserRound size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full animate-enter">
        {title ? (
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--forest)]">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
      {showDisclaimer ? (
        <p className="text-center text-xs text-[var(--muted)] px-4 pb-6 max-w-lg mx-auto leading-5">
          {t.disclaimer}
        </p>
      ) : null}
    </div>
  );
}
