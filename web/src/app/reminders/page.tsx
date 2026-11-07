'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type Reminder = { id: string; title: string; body: string | null; next_run_at: string };

export default function RemindersPage() {
  const { t } = useI18n();
  const { token } = useSession();
  const [items, setItems] = useState<Reminder[] | null>(null);

  async function load() {
    if (!token) return;
    setItems(await api<Reminder[]>('/api/reminders', { token }));
  }
  useEffect(() => { void load(); }, [token]);

  async function cancel(id: string) {
    if (!token) return;
    await api(`/api/reminders/${id}`, { token, method: 'DELETE' });
    await load();
  }

  return (
    <AppShell title={t.reminders}>
      {items === null ? <p>{t.loading}</p> : items.length === 0 ? <p className="text-[var(--muted)]">{t.empty}</p> : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="card">
              <p className="font-medium">{r.title}</p>
              {r.body ? <p className="text-sm text-[var(--muted)]">{r.body}</p> : null}
              <p className="text-xs text-[var(--muted)] mt-1">{new Date(r.next_run_at).toLocaleString()}</p>
              <button type="button" className="btn btn-ghost mt-3" onClick={() => cancel(r.id)}>ยกเลิก</button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
