'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type Cfg = { key: string; value: unknown };

export default function AdminSettings() {
  const { token } = useSession();
  const [rows, setRows] = useState<Cfg[]>([]);

  async function load() {
    if (!token) return;
    setRows(await api<Cfg[]>('/api/admin/config', { token }));
  }
  useEffect(() => { void load(); }, [token]);

  async function set(key: string, value: unknown) {
    if (!token) return;
    await api('/api/admin/config', { token, method: 'PATCH', body: { key, value } });
    await load();
  }

  const get = (k: string) => rows.find((r) => r.key === k)?.value;

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">Settings</h1>
      <div className="space-y-4 max-w-md">
        <label className="card flex items-center justify-between gap-3">
          <span>require_invite</span>
          <input type="checkbox" className="h-6 w-6" checked={get('require_invite') === true || get('require_invite') === 'true'}
            onChange={(e) => set('require_invite', e.target.checked)} />
        </label>
        <label className="card block">
          <span>trial_days</span>
          <input type="number" className="mt-2 w-full min-h-11 rounded-xl border px-3"
            defaultValue={Number(get('trial_days') ?? 14)}
            onBlur={(e) => set('trial_days', Number(e.target.value))} />
        </label>
        <label className="card flex items-center justify-between gap-3">
          <span>พัก LLM (โซนแดงยังทำงาน)</span>
          <input type="checkbox" className="h-6 w-6" checked={get('llm_paused') === true || get('llm_paused') === 'true'}
            onChange={(e) => set('llm_paused', e.target.checked)} />
        </label>
      </div>
    </div>
  );
}
