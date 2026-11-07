'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight, Languages, LockKeyhole, LogOut, MessageCircle, Trash2, UserRound } from 'lucide-react';
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
    const res = await api<{ code: string; instruction: string }>('/api/channels/line/link-code', {
      token, method: 'POST', body: {},
    });
    setLineCode(res.code);
    setMsg(res.instruction);
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/login');
  }

  async function deleteAll() {
    if (!token || !confirm(locale === 'th' ? 'ลบข้อมูลทั้งหมดถาวร?' : 'Permanently delete all data?')) return;
    await api('/api/me', { token, method: 'DELETE' });
    await createClient().auth.signOut();
    router.replace('/login');
  }

  return (
    <AppShell title={t.settings} subtitle={locale === 'th' ? 'จัดการบัญชีและข้อมูลของคุณ' : 'Manage account and data'}>
      <div className="card mb-4 p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
            <UserRound size={18} aria-hidden />
          </div>
          <div>
            <p className="font-bold">{locale === 'th' ? 'บัญชีของคุณ' : 'Your account'}</p>
            <p className="text-xs text-[var(--muted)]">RakSat</p>
          </div>
        </div>

        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 border-b border-[var(--line)] px-4 text-left"
          onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
        >
          <Languages size={17} className="text-[var(--muted)]" aria-hidden />
          <span className="flex-1 text-sm font-semibold">{t.language}</span>
          <span className="text-xs text-[var(--muted)]">{locale === 'th' ? 'ไทย (TH)' : 'English (EN)'}</span>
          <ChevronRight size={16} className="text-[var(--muted)]" aria-hidden />
        </button>

        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 border-b border-[var(--line)] px-4 text-left"
          onClick={linkLine}
        >
          <MessageCircle size={17} className="text-[var(--muted)]" aria-hidden />
          <span className="flex-1 text-sm font-semibold">{t.lineLink}</span>
          <span className="text-xs text-[var(--muted)]">{lineCode || '—'}</span>
          <ChevronRight size={16} className="text-[var(--muted)]" aria-hidden />
        </button>

        <Link href="/reminders" className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
          <Bell size={17} className="text-[var(--muted)]" aria-hidden />
          <span className="flex-1 text-sm font-semibold">{t.reminders}</span>
          <ChevronRight size={16} className="text-[var(--muted)]" aria-hidden />
        </Link>
      </div>

      {lineCode ? (
        <div className="card mb-4 text-center">
          <p className="text-2xl font-mono tracking-widest">{lineCode}</p>
          {msg ? <p className="mt-2 text-sm text-[var(--muted)]">{msg}</p> : null}
        </div>
      ) : null}

      <div className="card mb-4">
        <div className="mb-3 flex items-start gap-3">
          <LockKeyhole size={18} className="mt-0.5 text-[var(--leaf)]" aria-hidden />
          <div>
            <p className="font-bold text-sm">{locale === 'th' ? 'ความเป็นส่วนตัวและข้อมูล' : 'Privacy & data'}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {locale === 'th'
                ? 'คุณควบคุมข้อมูลของตัวเองได้เสมอ การแชร์ให้สัตวแพทย์ต้องยืนยันก่อนทุกครั้ง'
                : 'You control your data. Sharing with a vet always requires confirmation.'}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-danger w-full" onClick={deleteAll}>
          <Trash2 size={15} aria-hidden /> {t.deleteAccount}
        </button>
      </div>

      <Link href="/admin" className="btn btn-ghost w-full mb-3">{t.admin}</Link>
      <button type="button" className="btn btn-ghost w-full" onClick={logout}>
        <LogOut size={16} aria-hidden /> {t.logout}
      </button>
    </AppShell>
  );
}
