'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/components/I18nProvider';
import { AppShell } from '@/components/AppShell';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const supabase = createClient();
    const res = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    router.replace('/');
  }

  return (
    <AppShell title={mode === 'login' ? t.login : t.signup}>
      <p className="text-[var(--muted)] mb-6">{t.tagline}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm">{t.email}</span>
          <input className="mt-1 w-full min-h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{t.password}</span>
          <input className="mt-1 w-full min-h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {err ? <p className="text-[var(--danger)]" role="alert">{err}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? t.loading : (mode === 'login' ? t.login : t.signup)}</button>
      </form>
      <button type="button" className="btn btn-ghost w-full mt-3" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? t.signup : t.login}
      </button>
    </AppShell>
  );
}
