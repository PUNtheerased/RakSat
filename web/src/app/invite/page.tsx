'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    setBusy(true); setErr('');
    try {
      await api('/api/invite/redeem', { token, body: { code } });
      router.replace('/');
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t.inviteTitle}>
      <form onSubmit={onSubmit} className="card space-y-4">
        <p className="text-sm text-[var(--muted)]">{t.inviteHint}</p>
        <input
          className="w-full min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 uppercase tracking-wider"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="RAK-XXXX-XXXX"
          required
          aria-label={t.inviteTitle}
        />
        {err ? <p className="text-[var(--danger)]" role="alert">{err}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? t.loading : t.inviteSubmit}</button>
      </form>
    </AppShell>
  );
}
