'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

export default function ConsentPage() {
  const { t } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!token) return;
    setBusy(true);
    await api('/api/consent', { token, method: 'POST', body: {} });
    setBusy(false);
    router.replace('/');
  }

  return (
    <AppShell title={t.consentTitle}>
      <div className="card space-y-4">
        <p>{t.consentBody}</p>
        <p className="text-sm text-[var(--muted)]">{t.disclaimer}</p>
        <button type="button" className="btn btn-primary w-full" disabled={busy || !token} onClick={accept}>
          {busy ? t.loading : t.consentAccept}
        </button>
      </div>
    </AppShell>
  );
}
