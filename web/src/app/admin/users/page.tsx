'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type User = {
  id: string; activated_at: string | null; access_until: string | null;
  suspended_at: string | null; chat_count: string;
};

export default function AdminUsers() {
  const { token } = useSession();
  const [rows, setRows] = useState<User[]>([]);

  async function load() {
    if (!token) return;
    setRows(await api<User[]>('/api/admin/users', { token }));
  }
  useEffect(() => { void load(); }, [token]);

  return (
    <div>
      <h1 className="font-display text-2xl mb-2">Users</h1>
      <p className="text-sm text-[var(--muted)] mb-4">ไม่แสดงเนื้อหาแชต</p>
      <ul className="space-y-2">
        {rows.map((u) => (
          <li key={u.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-xs">{u.id}</p>
              <p className="text-sm">chats {u.chat_count} · until {u.access_until ?? '—'} {u.suspended_at ? '· suspended' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={async () => {
                if (!token) return;
                await api(`/api/admin/users/${u.id}/extend`, { token, body: { days: 14 } });
                await load();
              }}>ต่ออายุ</button>
              <button type="button" className="btn btn-danger" onClick={async () => {
                if (!token) return;
                await api(`/api/admin/users/${u.id}/suspend`, { token, method: 'POST', body: {} });
                await load();
              }}>ระงับ</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
