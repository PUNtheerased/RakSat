'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
      <main className="min-h-dvh max-w-lg mx-auto px-4 py-10">
        <h1 className="font-display text-2xl mb-2">ลิงก์หมดอายุหรือไม่พบ</h1>
        <p className="text-[var(--muted)]">{err}</p>
      </main>
    );
  }
  if (!summary) return <main className="p-8">{t.loading}</main>;

  return (
    <main className="min-h-dvh max-w-lg mx-auto px-4 py-8">
      <p className="text-sm text-[var(--muted)]">{t.brand} · สรุปให้สัตวแพทย์</p>
      <h1 className="font-display text-3xl mt-2">{summary.pet.name}</h1>
      <p className="text-[var(--muted)] mb-4">
        {summary.pet.species}{summary.pet.breed ? ` · ${summary.pet.breed}` : ''}{summary.pet.age ? ` · ${summary.pet.age}` : ''}
      </p>
      {summary.triage ? (
        <section className="card mb-4">
          <p className={`zone-pill zone-${summary.triage.zone}`}>โซน {summary.triage.zone}</p>
          <pre className="text-sm mt-3 whitespace-pre-wrap">{JSON.stringify(summary.triage.reasons, null, 2)}</pre>
        </section>
      ) : null}
      <section className="card mb-4">
        <h2 className="font-semibold mb-2">เหตุการณ์ล่าสุด</h2>
        <ul className="space-y-2 text-sm">
          {summary.recentEvents.map((e, i) => (
            <li key={i}>{e.kind}{e.note ? ` — ${e.note}` : ''} · {new Date(e.at).toLocaleString()}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-[var(--muted)] mb-6">{summary.disclaimer}</p>
      {!thanks ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" onClick={() => feedback(true)}>{t.helpfulYes}</button>
          <button type="button" className="btn btn-ghost flex-1" onClick={() => feedback(false)}>{t.helpfulNo}</button>
        </div>
      ) : <p role="status">ขอบคุณสำหรับความคิดเห็น</p>}
    </main>
  );
}
