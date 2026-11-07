'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

type PetClinic = { id: string; place_id: string; label: string; is_primary: boolean; note: string | null };

export default function ClinicsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { token } = useSession();
  const [list, setList] = useState<PetClinic[]>([]);
  const [label, setLabel] = useState('');
  const [placeId, setPlaceId] = useState('');

  async function refresh() {
    if (!token) return;
    setList(await api<PetClinic[]>(`/api/pets/${id}/clinics`, { token }));
  }
  useEffect(() => { void refresh(); }, [token, id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    await api(`/api/pets/${id}/clinics`, {
      token, body: { placeId: placeId || `manual-${Date.now()}`, label, isPrimary: list.length === 0 },
    });
    setLabel(''); setPlaceId('');
    await refresh();
  }

  async function makePrimary(clinicId: string) {
    if (!token) return;
    await api(`/api/pets/${id}/clinics/${clinicId}`, { token, method: 'PATCH', body: { isPrimary: true } });
    await refresh();
  }

  async function remove(clinicId: string) {
    if (!token) return;
    await api(`/api/pets/${id}/clinics/${clinicId}`, { token, method: 'DELETE' });
    await refresh();
  }

  return (
    <AppShell title={t.clinicsManage}>
      <ul className="space-y-3 mb-6">
        {list.length === 0 ? <p className="text-[var(--muted)]">{t.empty}</p> : null}
        {list.map((c) => (
          <li key={c.id} className="card">
            <p className="font-medium">{c.label}{c.is_primary ? ' · ประจำ' : ''}</p>
            <p className="text-xs text-[var(--muted)] break-all">{c.place_id}</p>
            <div className="flex gap-2 mt-3">
              {!c.is_primary ? <button type="button" className="btn btn-ghost" onClick={() => makePrimary(c.id)}>ตั้งเป็นประจำ</button> : null}
              <button type="button" className="btn btn-ghost" onClick={() => remove(c.id)}>ลบ</button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="card space-y-3">
        <label className="block">
          <span className="text-sm">ชื่อคลินิก</span>
          <input className="mt-1 w-full min-h-11 rounded-xl border border-[var(--line)] px-3" required value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">Place ID (ถ้ามี)</span>
          <input className="mt-1 w-full min-h-11 rounded-xl border border-[var(--line)] px-3" value={placeId} onChange={(e) => setPlaceId(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary w-full">บันทึก</button>
      </form>
    </AppShell>
  );
}
