'use client';

import { useEffect, useState } from 'react';
import { Bell, Clock3 } from 'lucide-react';
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
      {items === null ? (
        <p aria-live="polite">{t.loading}</p>
      ) : items.length === 0 ? (
        <div className="card text-center text-[var(--muted)]">
          <Bell size={24} className="mx-auto mb-3 text-[var(--leaf)]" aria-hidden />
          <p>{t.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--amber-bg)] text-[var(--amber)]">
                  <Clock3 size={18} aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{r.title}</p>
                  {r.body ? <p className="mt-1 text-sm text-[var(--muted)]">{r.body}</p> : null}
                  <p className="mt-1 text-xs text-[var(--muted)]">{new Date(r.next_run_at).toLocaleString()}</p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => cancel(r.id)}>
                ยกเลิก
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
