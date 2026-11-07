'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type Row = {
  id: string; zone: string; reasons: unknown; inputText: string; createdAt: string;
  reviewLabel: string | null; species: string; ownerId?: string;
};

const labels = [
  { value: 'rule_correct', text: 'กฎถูก' },
  { value: 'over_alert', text: 'เตือนเกิน' },
  { value: 'missed', text: 'พลาด' },
] as const;

export default function AdminReview() {
  const { token } = useSession();
  const [rows, setRows] = useState<Row[]>([]);

  async function load(reveal = false) {
    if (!token) return;
    const q = reveal ? '?reveal=true&reason=vet_review' : '';
    setRows(await api<Row[]>(`/api/admin/review${q}`, { token }));
  }
  useEffect(() => { void load(false); }, [token]);

  async function setLabel(id: string, label: string) {
    if (!token) return;
    await api(`/api/admin/review/${id}`, { token, method: 'PATCH', body: { label } });
    await load(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <h1 className="font-display text-2xl flex-1">Review</h1>
        <button type="button" className="btn btn-ghost" onClick={() => load(true)}>ดูตัวตน (มีเหตุผล+audit)</button>
        <button type="button" className="btn btn-primary" onClick={async () => {
          if (!token) return;
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/review/export.csv`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'raksat-review.csv'; a.click();
          URL.revokeObjectURL(url);
        }}>Export CSV</button>
      </div>
      <p className="text-sm text-[var(--muted)] mb-4">ซ่อนตัวตนเป็นค่าเริ่มต้น — Export ผ่าน API ต้องแนบ Bearer (ใช้จาก curl/admin tool ใน production)</p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="card">
            <p className={`zone-pill zone-${r.zone} mb-2`}>{r.zone} · {r.species}</p>
            <p className="mb-2">{r.inputText}</p>
            <p className="text-xs text-[var(--muted)] mb-2">{new Date(r.createdAt).toLocaleString()}</p>
            {r.ownerId ? <p className="text-xs mb-2">owner: {r.ownerId}</p> : null}
            <div className="flex flex-wrap gap-2">
              {labels.map((l) => (
                <button key={l.value} type="button" className={`btn ${r.reviewLabel === l.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLabel(r.id, l.value)}>{l.text}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
