'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

export default function ConsentPage() {
  const { t, locale } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const points = locale === 'th'
    ? [
        'คุณเป็นผู้ตัดสินใจและยืนยันทุกการดำเนินการ',
        'ข้อมูลถูกใช้เพื่อประเมินเบื้องต้นและปรับปรุงความปลอดภัย',
        'คุณขอลบข้อมูลทั้งหมดได้จากตั้งค่าทุกเมื่อ',
      ]
    : [
        'You decide and confirm every write action',
        'Data is used for preliminary triage and safety review',
        'You can delete all data anytime in Settings',
      ];

  async function accept() {
    if (!token) return;
    setBusy(true);
    await api('/api/consent', { token, method: 'POST', body: {} });
    setBusy(false);
    router.replace('/app');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[520px] animate-enter">
        <Logo href="/" />
        <div className="mt-10 mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--forest)]">
          <ShieldCheck size={26} aria-hidden />
        </div>
        <h1 className="text-4xl font-semibold text-[var(--forest)] tracking-[-0.03em]">{t.consentTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{t.consentBody}</p>

        <div className="mt-8 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          {points.map((x) => (
            <div key={x} className="flex gap-3 text-sm leading-6">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
                <Check size={12} aria-hidden />
              </span>
              {x}
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-6 text-[var(--muted)]">{t.disclaimer}</p>
        <button
          type="button"
          className="btn btn-primary mt-7 w-full"
          disabled={busy || !token}
          onClick={accept}
        >
          {busy ? t.loading : t.consentAccept}
          {!busy ? <ArrowRight size={16} aria-hidden /> : null}
        </button>
      </div>
    </main>
  );
}
