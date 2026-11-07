'use client';

import Link from 'next/link';
import { ArrowRight, Check, Languages, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';

export default function LandingPage() {
  const { t, locale, setLocale } = useI18n();
  const { token, loading } = useSession();
  const appHref = loading ? '/login' : (token ? '/app' : '/login');

  const steps = [
    { num: '01', title: t.landingStep1Title, body: t.landingStep1Body },
    { num: '02', title: t.landingStep2Title, body: t.landingStep2Body },
    { num: '03', title: t.landingStep3Title, body: t.landingStep3Body },
  ];

  const notItems = locale === 'th'
    ? ['ไม่วินิจฉัยโรค', 'ไม่บอกชื่อยาและขนาดยา', 'ไม่แทนที่การตรวจโดยสัตวแพทย์', 'ไม่ดำเนินการใด ๆ โดยไม่ยืนยัน']
    : ['Does not diagnose disease', 'Does not name drugs or doses', 'Does not replace a vet exam', 'Does nothing without your confirmation'];

  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-10">
        <Logo href="/" />
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/60 px-3 py-2 text-[var(--muted)] sm:inline-flex min-h-11"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            aria-label={t.language}
          >
            <Languages size={15} aria-hidden /> TH / EN
          </button>
          <Link href={appHref} className="rounded-xl px-3 py-2 text-[var(--forest)] hover:bg-white min-h-11 inline-flex items-center">
            {token ? t.openApp : t.login}
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 lg:px-10 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#dcebdc]/70 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--leaf)]">
            <span className="h-2 w-2 rounded-full bg-[var(--leaf)]" aria-hidden />
            {locale === 'th' ? 'ดูแลน้องได้อย่างมั่นใจขึ้น' : 'Care with more confidence'}
          </p>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--forest)] sm:text-7xl">
            {t.landingHeadline}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">{t.landingLead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={appHref} className="btn btn-primary shadow-[0_12px_24px_rgba(23,75,56,.18)]">
              {token ? t.openApp : t.landingCta} <ArrowRight size={16} aria-hidden />
            </Link>
            <a href="#how" className="btn btn-ghost bg-white/50">{t.landingHow}</a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-[var(--muted)]">
            <ShieldCheck size={15} className="text-[var(--leaf)]" aria-hidden />
            {locale === 'th' ? 'ข้อมูลของคุณอยู่ภายใต้การควบคุมของคุณเสมอ' : 'Your data stays under your control'}
          </p>
        </div>
      </section>

      <section id="how" className="border-y border-[var(--line)] bg-[#eef2e9]/70 px-5 py-20 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-[var(--leaf)]">{t.landingHowTitle}</p>
          <h2 className="mt-2 max-w-xl text-4xl font-semibold leading-tight text-[var(--forest)]">
            {locale === 'th' ? <>ช่วยให้คุณตัดสินใจ<br />เรื่องสำคัญได้ชัดขึ้น</> : <>Clearer decisions<br />when it matters</>}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <article key={s.num} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <span className="text-xs font-bold text-[var(--leaf)]">{s.num}</span>
                <h3 className="mt-8 text-lg font-bold text-[var(--forest)]">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--coral)]">{t.landingNotTitle}</p>
            <h2 className="mt-2 text-4xl font-semibold leading-tight text-[var(--forest)]">
              {locale === 'th' ? <>ผู้ช่วยที่รู้ขอบเขต<br />ของตัวเอง</> : <>An assistant that<br />knows its limits</>}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {notItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm font-semibold">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
                  <Check size={14} aria-hidden />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 rounded-xl bg-[#f0e8dc] p-4 text-center text-sm leading-6 text-[#6b5a47]">
          {t.landingNotBody}
          <br />
          {t.disclaimer}
        </p>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-10 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--muted)]">
            RakSat · TYNAEX · {locale === 'th' ? 'ดูแลน้องอย่างเข้าใจ' : 'Care with understanding'}
          </div>
          <Link href={appHref} className="btn btn-primary">
            {token ? t.openApp : t.landingCta} <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </footer>
    </main>
  );
}
