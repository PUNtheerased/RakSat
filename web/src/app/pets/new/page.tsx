'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError } from '@/lib/api';

export default function NewPetPage() {
  const { t } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setErr('');
    try {
      const pet = await api<{ id: string }>('/api/pets', { token, body: { name, species } });
      router.replace(`/pets/${pet.id}/chat`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : t.error);
      setBusy(false);
    }
  }

  return (
    <AppShell title={t.addPet}>
      <form onSubmit={onSubmit} className="card space-y-4">
        <label className="block">
          <span className="text-sm">ชื่อ</span>
          <input className="mt-1 w-full min-h-11 rounded-xl border border-[var(--line)] px-3 bg-white" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset>
          <legend className="text-sm mb-2">ชนิด</legend>
          <div className="flex gap-2">
            <button type="button" className={`btn flex-1 ${species === 'dog' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSpecies('dog')}>สุนัข</button>
            <button type="button" className={`btn flex-1 ${species === 'cat' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSpecies('cat')}>แมว</button>
          </div>
        </fieldset>
        {err ? <p className="text-[var(--danger)]" role="alert">{err}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? t.loading : t.addPet}</button>
      </form>
    </AppShell>
  );
}
