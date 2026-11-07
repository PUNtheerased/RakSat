'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError } from '@/lib/api';

export default function NewPetPage() {
  const { t, locale } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('cat');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr('');
    try {
      const pet = await api<{ id: string }>('/api/pets', { token, body: { name, species } });
      router.replace(`/pets/${pet.id}/chat`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.code : t.error);
      setBusy(false);
    }
  }

  return (
    <AppShell title={t.addPet} subtitle={locale === 'th' ? 'เพิ่มข้อมูลน้องเพื่อเริ่มประเมินอาการ' : 'Add a pet to start triage'}>
      <form onSubmit={onSubmit} className="card space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{locale === 'th' ? 'ชื่อของน้อง' : 'Pet name'}</span>
          <input
            className="field"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === 'th' ? 'เช่น มะลิ' : 'e.g. Mali'}
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{locale === 'th' ? 'ประเภท' : 'Species'}</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`min-h-12 rounded-xl text-sm font-semibold ${species === 'cat' ? 'border-2 border-[var(--forest)] bg-[var(--mint)]' : 'border border-[var(--line)]'}`}
              onClick={() => setSpecies('cat')}
            >
              {locale === 'th' ? 'แมว' : 'Cat'}
            </button>
            <button
              type="button"
              className={`min-h-12 rounded-xl text-sm font-semibold ${species === 'dog' ? 'border-2 border-[var(--forest)] bg-[var(--mint)]' : 'border border-[var(--line)]'}`}
              onClick={() => setSpecies('dog')}
            >
              {locale === 'th' ? 'สุนัข' : 'Dog'}
            </button>
          </div>
        </fieldset>
        {err ? <p className="text-[var(--coral)]" role="alert">{err}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t.loading : t.addPet}
          {!busy ? <Check size={16} aria-hidden /> : null}
        </button>
      </form>
    </AppShell>
  );
}
