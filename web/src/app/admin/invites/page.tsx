'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type Invite = {
  id: string; label: string | null; cohort: string | null; max_uses: number; used_count: number;
  expires_at: string | null; revoked_at: string | null;
};

export default function AdminInvites() {
  const { token } = useSession();
  const [list, setList] = useState<Invite[]>([]);
  const [freshCode, setFreshCode] = useState('');
  const [label, setLabel] = useState('');
  const [cohort, setCohort] = useState('beta');

  async function load() {
    if (!token) return;
    setList(await api<Invite[]>('/api/admin/invites', { token }));
  }
  useEffect(() => { void load(); }, [token]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const res = await api<{ id: string; code: string }>('/api/admin/invites', {
      token, body: { label, cohort, maxUses: 1 },
    });
    setFreshCode(res.code);
    await load();
  }

  async function revoke(id: string) {
    if (!token) return;
    await api(`/api/admin/invites/${id}/revoke`, { token, method: 'POST', body: {} });
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">Invites</h1>
      <form onSubmit={create} className="card mb-6 space-y-3 max-w-md">
        <input className="w-full min-h-11 rounded-xl border px-3" placeholder="label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="w-full min-h-11 rounded-xl border px-3" placeholder="cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} />
        <button type="submit" className="btn btn-primary">สร้าง key</button>
        {freshCode ? (
          <p className="font-mono text-lg break-all">คัดลอกทันที (โชว์ครั้งเดียว): <strong>{freshCode}</strong></p>
        ) : null}
      </form>
      <ul className="space-y-2">
        {list.map((i) => (
          <li key={i.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <p>{i.label ?? i.id} · {i.cohort} · {i.used_count}/{i.max_uses}</p>
              <p className="text-xs text-[var(--muted)]">{i.revoked_at ? 'revoked' : 'active'}</p>
            </div>
            {!i.revoked_at ? <button type="button" className="btn btn-ghost" onClick={() => revoke(i.id)}>ยกเลิก</button> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
