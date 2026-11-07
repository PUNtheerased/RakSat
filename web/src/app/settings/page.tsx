'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [lineCode, setLineCode] = useState('');
  const [msg, setMsg] = useState('');

  async function linkLine() {
    if (!token) return;
    const res = await api<{ code: string; instruction: string }>('/api/channels/line/link-code', { token, method: 'POST', body: {} });
    setLineCode(res.code);
    setMsg(res.instruction);
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/login');
  }

  async function deleteAll() {
    if (!token || !confirm('ลบข้อมูลทั้งหมดถาวร?')) return;
    await api('/api/me', { token, method: 'DELETE' });
    await createClient().auth.signOut();
    router.replace('/login');
  }

  return (
    <AppShell title={t.settings}>
      <div className="space-y-4">
        <div className="card">
          <p className="mb-2">{t.language}</p>
          <div className="flex gap-2">
            <button type="button" className={`btn flex-1 ${locale === 'th' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLocale('th')}>ไทย</button>
            <button type="button" className={`btn flex-1 ${locale === 'en' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLocale('en')}>English</button>
          </div>
        </div>
        <div className="card space-y-2">
          <button type="button" className="btn btn-ghost w-full" onClick={linkLine}>{t.lineLink}</button>
          {lineCode ? <p className="text-2xl font-mono tracking-widest text-center">{lineCode}</p> : null}
          {msg ? <p className="text-sm text-[var(--muted)]">{msg}</p> : null}
        </div>
        <Link href="/admin" className="btn btn-ghost w-full">{t.admin}</Link>
        <button type="button" className="btn btn-ghost w-full" onClick={logout}>{t.logout}</button>
        <button type="button" className="btn btn-danger w-full" onClick={deleteAll}>{t.deleteAccount}</button>
      </div>
    </AppShell>
  );
}
