'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Stethoscope } from 'lucide-react';
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
    setLabel('');
    setPlaceId('');
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
    <AppShell title={t.clinicsManage} subtitle="จัดการคลินิกที่พาน้องไปเป็นประจำ">
      <ul className="space-y-3 mb-6">
        {list.length === 0 ? <p className="text-[var(--muted)]">{t.empty}</p> : null}
        {list.map((c) => (
          <li key={c.id} className="card">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mint)] text-[var(--forest)]">
                <Stethoscope size={20} aria-hidden />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{c.label}</p>
                  {c.is_primary ? (
                    <span className="rounded-full bg-[var(--mint)] px-2 py-1 text-[10px] font-bold text-[var(--forest)]">
                      {t.primaryClinic}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)] break-all">{c.place_id}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!c.is_primary ? (
                <button type="button" className="btn btn-ghost" onClick={() => makePrimary(c.id)}>ตั้งเป็นประจำ</button>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={() => remove(c.id)}>ลบ</button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="card space-y-3">
        <p className="font-semibold flex items-center gap-2"><Plus size={16} aria-hidden /> เพิ่มคลินิก</p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">ชื่อคลินิก</span>
          <input className="field" required value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Place ID (ถ้ามี)</span>
          <input className="field" value={placeId} onChange={(e) => setPlaceId(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary w-full">บันทึก</button>
      </form>
    </AppShell>
  );
}
