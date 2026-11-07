'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ZonePill } from '@/components/ZonePill';
import { useI18n } from '@/components/I18nProvider';
import { api, ApiError } from '@/lib/api';

type Summary = {
  pet: { name: string; species: string; breed: string | null; age: string | null; conditions: string[]; allergies: string[] };
  triage: { zone: string; reasons: unknown; watchFor: unknown; at: string } | null;
  recentEvents: { kind: string; note: string | null; at: string }[];
  disclaimer: string;
  generatedAt: string;
};

export default function ReferralPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState('');
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
  }, []);

  useEffect(() => {
    api<{ summary: Summary }>(`/public/referrals/${token}`)
      .then((r) => setSummary(r.summary))
      .catch((e) => setErr(e instanceof ApiError ? e.code : t.error));
  }, [token, t.error]);

  async function feedback(helpful: boolean) {
    await api(`/public/referrals/${token}/feedback`, { method: 'POST', body: { helpful } });
    setThanks(true);
  }

  if (err) {
    return (
      <main className="min-h-dvh max-w-2xl mx-auto px-5 py-10">
        <Logo href="/" />
        <h1 className="mt-10 text-2xl font-bold text-[var(--forest)]">ลิงก์หมดอายุหรือไม่พบ</h1>
        <p className="mt-2 text-[var(--muted)]">{err}</p>
      </main>
    );
  }
  if (!summary) {
    return <main className="p-8" aria-live="polite">{t.loading}</main>;
  }

  const zone = summary.triage?.zone;
  const reasons = Array.isArray(summary.triage?.reasons)
    ? (summary.triage!.reasons as string[])
    : [];

  return (
    <main className="min-h-dvh bg-white px-5 py-8 text-[var(--ink)]">
      <div className="mx-auto max-w-2xl animate-enter">
        <div className="mb-8 flex items-center justify-between border-b border-[var(--line)] pb-5">
          <Logo href="/" showTag={false} />
          <span className="text-xs text-[var(--muted)]">สรุปเพื่อสัตวแพทย์</span>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          สร้างเมื่อ {new Date(summary.generatedAt).toLocaleString()}
        </p>
        <h1 className="text-3xl font-bold">สรุปอาการของ {summary.pet.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {summary.pet.species}
          {summary.pet.breed ? ` · ${summary.pet.breed}` : ''}
          {summary.pet.age ? ` · ${summary.pet.age}` : ''}
        </p>

        {summary.triage && (zone === 'green' || zone === 'yellow' || zone === 'red') ? (
          <section className="my-7 rounded-2xl border border-[#efb6b0] bg-[var(--coral-bg)] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--coral)]">ระดับความเร่งด่วน</span>
              <ZonePill zone={zone} />
            </div>
            {reasons.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <Check size={16} className="mt-0.5 text-[var(--coral)]" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <h2 className="mb-3 font-bold">เหตุการณ์ล่าสุด</h2>
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--line)]">
          {summary.recentEvents.length === 0 ? (
            <p className="p-3 text-sm text-[var(--muted)]">{t.empty}</p>
          ) : (
            summary.recentEvents.map((e, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-[var(--line)] p-3 text-sm last:border-b-0">
                <span>{e.kind}{e.note ? ` — ${e.note}` : ''}</span>
                <span className="shrink-0 text-[var(--muted)]">{new Date(e.at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        <p className="text-sm text-[var(--muted)] mb-6">{summary.disclaimer}</p>

        {!thanks ? (
          <div>
            <p className="mb-3 text-center text-sm font-semibold">ข้อมูลสรุปนี้มีประโยชน์ไหม?</p>
            <div className="flex justify-center gap-2">
              <button type="button" className="btn btn-soft" onClick={() => feedback(true)}>
                <Check size={15} aria-hidden /> {t.helpfulYes}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => feedback(false)}>
                <X size={15} aria-hidden /> {t.helpfulNo}
              </button>
            </div>
          </div>
        ) : (
          <p role="status" className="text-center">ขอบคุณสำหรับความคิดเห็น</p>
        )}
      </div>
    </main>
  );
}
