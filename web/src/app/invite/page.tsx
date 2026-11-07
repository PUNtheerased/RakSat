'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError } from '@/lib/api';

export default function InvitePage() {
  const { t } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr('');
    try {
      await api('/api/invite/redeem', { token, body: { code } });
      router.replace('/app');
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t.inviteTitle} subtitle={t.inviteHint} showDisclaimer={false}>
      <form onSubmit={onSubmit} className="card space-y-4">
        <label className="block text-sm font-semibold" htmlFor="invite">{t.inviteTitle}</label>
        <input
          id="invite"
          className="field font-mono text-lg tracking-widest uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="RAK-XXXX-XXXX"
          required
        />
        {err ? <p className="text-[var(--coral)]" role="alert">{err}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t.loading : t.inviteSubmit}
          {!busy ? <ArrowRight size={16} aria-hidden /> : null}
        </button>
      </form>
    </AppShell>
  );
}
