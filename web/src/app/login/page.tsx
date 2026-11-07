'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Languages } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/components/I18nProvider';

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const supabase = createClient();
    const res = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    router.replace('/app');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] animate-enter">
        <div className="mb-8 flex items-center justify-between">
          <Logo href="/" />
          <button
            type="button"
            className="flex min-h-11 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted)]"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            aria-label={t.language}
          >
            <Languages size={15} aria-hidden /> TH / EN
          </button>
        </div>

        <p className="mb-3 text-sm font-semibold text-[var(--leaf)]">
          {locale === 'th' ? 'ดูแลน้องได้อย่างมั่นใจขึ้น' : 'Care with more confidence'}
        </p>
        <h1 className="mb-3 text-[34px] font-bold leading-[1.15] tracking-[-0.04em] text-[var(--forest)]">
          {mode === 'login'
            ? (locale === 'th' ? <>ยินดีต้อนรับ<br />กลับมา</> : <>Welcome<br />back</>)
            : (locale === 'th' ? <>สร้างบัญชี<br />ใหม่</> : <>Create your<br />account</>)}
        </h1>
        <p className="mb-8 text-sm leading-7 text-[var(--muted)]">{t.tagline}</p>

        <form onSubmit={onSubmit} className="card p-5">
          <div className="mb-4 flex border-b border-[var(--line)]">
            <button
              type="button"
              className={`w-1/2 pb-3 text-sm font-semibold ${mode === 'login' ? 'border-b-2 border-[var(--forest)] text-[var(--forest)]' : 'text-[var(--muted)]'}`}
              onClick={() => setMode('login')}
            >
              {t.login}
            </button>
            <button
              type="button"
              className={`w-1/2 pb-3 text-sm font-semibold ${mode === 'signup' ? 'border-b-2 border-[var(--forest)] text-[var(--forest)]' : 'text-[var(--muted)]'}`}
              onClick={() => setMode('signup')}
            >
              {t.signup}
            </button>
          </div>

          <label className="mb-1.5 block text-xs font-semibold" htmlFor="email">{t.email}</label>
          <input
            id="email"
            className="field mb-4"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="password">{t.password}</label>
          <input
            id="password"
            className="field mb-5"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={locale === 'th' ? 'อย่างน้อย 6 ตัวอักษร' : 'At least 6 characters'}
          />
          {err ? <p className="mb-3 text-sm text-[var(--coral)]" role="alert">{err}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? t.loading : (mode === 'login' ? t.login : t.signup)}
            {!busy ? <ArrowRight size={16} aria-hidden /> : null}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          {locale === 'th' ? 'มีรหัสเชิญ?' : 'Have an invite?'}{' '}
          <Link href="/invite" className="font-semibold text-[var(--leaf)]">
            {locale === 'th' ? 'เปิดใช้งานที่นี่' : 'Activate here'}
          </Link>
        </p>
      </div>
    </main>
  );
}
