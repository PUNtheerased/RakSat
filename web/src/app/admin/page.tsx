'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type Dash = {
  activatedOwners: number; returned7d: number;
  zones: Record<string, number>; feedbackDown: number; feedbackUp: number;
  remindersSent: number; referralHelpful: number;
  llmByDay: { day: string; input: string; output: string }[];
};

export default function AdminDashboard() {
  const { token } = useSession();
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Dash>('/api/admin/dashboard', { token })
      .then(setData)
      .catch((e) => setErr(String(e.message ?? e)));
  }, [token]);

  if (err) return <p className="text-[var(--danger)]">{err}</p>;
  if (!data) return <p>กำลังโหลด…</p>;

  const cards = [
    ['ผู้ใช้เปิดใช้งาน', data.activatedOwners],
    ['กลับมาใน 7 วัน', data.returned7d],
    ['โซนเขียว', data.zones.green ?? 0],
    ['โซนเหลือง', data.zones.yellow ?? 0],
    ['โซนแดง', data.zones.red ?? 0],
    ['👎', data.feedbackDown],
    ['👍', data.feedbackUp],
    ['เตือนที่ส่งถึง', data.remindersSent],
    ['สรุป helpful', data.referralHelpful],
  ] as const;

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {cards.map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="font-display text-3xl mt-1">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="font-semibold mb-2">LLM tokens / วัน</h2>
      <ul className="card text-sm space-y-1">
        {data.llmByDay.length === 0 ? <li>ยังไม่มีข้อมูล</li> : data.llmByDay.map((d) => (
          <li key={d.day}>{d.day}: in {d.input} / out {d.output}</li>
        ))}
      </ul>
    </div>
  );
}
