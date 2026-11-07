'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, type AgentResult } from '@/lib/api';

type Clinic = AgentResult['clinics'][number];
type PetClinic = { id: string; place_id: string; label: string; is_primary: boolean; note: string | null };

export default function EmergencyPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { token } = useSession();
  const [result, setResult] = useState<AgentResult | null>(null);
  const [primary, setPrimary] = useState<PetClinic | null>(null);
  const [nearby, setNearby] = useState<Clinic[]>([]);
  const [summaryUrl, setSummaryUrl] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem(`raksat_emergency_${id}`);
    if (raw) setResult(JSON.parse(raw) as AgentResult);
  }, [id]);

  useEffect(() => {
    if (!token) return;
    api<PetClinic[]>(`/api/pets/${id}/clinics`, { token }).then((list) => {
      setPrimary(list.find((c) => c.is_primary) ?? list[0] ?? null);
    }).catch(() => {});
  }, [token, id]);

  async function loadNearby() {
    setStatus(t.loading);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
      const data = await api<{ clinics: Clinic[] }>(
        `/api/clinics?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&mode=emergency`,
        { token });
      setNearby(data.clinics);
      setStatus('');
    } catch {
      setStatus(t.requestLocation);
    }
  }

  async function sendSummary(placeId?: string) {
    if (!token) return;
    const res = await api<{ url: string }>('/api/referrals', {
      token, body: { petId: id, clinicPlaceId: placeId },
    });
    setSummaryUrl(res.url);
  }

  return (
    <div className="min-h-dvh bg-[#2a1210] text-[#f8efeb] px-4 py-6 max-w-lg mx-auto">
      <p className="font-display text-sm tracking-wide opacity-80">{t.brand}</p>
      <h1 className="font-display text-3xl mt-2 mb-3">{t.emergencyTitle}</h1>
      <p className="mb-4 text-lg">{result?.reply ?? t.loading}</p>
      {result?.reasons?.length ? (
        <ul className="mb-6 space-y-1 list-disc pl-5">
          {result.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      ) : null}

      {primary ? (
        <section className="mb-6 rounded-2xl border border-white/20 p-4">
          <h2 className="font-semibold mb-2">{t.primaryClinic}</h2>
          <p className="text-xl mb-3">{primary.label}</p>
          <button type="button" className="btn btn-primary w-full mb-2" onClick={() => sendSummary(primary.place_id)}>
            {t.sendSummary}
          </button>
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="font-semibold mb-2">{t.nearbyOpen}</h2>
        {(nearby.length ? nearby : result?.clinics ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-white/15 p-3 mb-2">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm opacity-80">{c.address} · {c.distanceKm} กม.</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {c.phone ? <a className="btn btn-ghost" href={`tel:${c.phone}`}>โทร</a> : null}
              <a className="btn btn-ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + c.address)}`} target="_blank" rel="noreferrer">นำทาง</a>
              <button type="button" className="btn btn-primary" onClick={() => sendSummary(c.id)}>{t.sendSummary}</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost w-full mt-2" onClick={loadNearby}>{t.requestLocation}</button>
        {status ? <p className="mt-2 text-sm opacity-80" aria-live="polite">{status}</p> : null}
      </section>

      {!primary ? (
        <button type="button" className="btn btn-primary w-full mb-4" onClick={() => sendSummary()}>{t.sendSummary}</button>
      ) : null}
      {summaryUrl ? (
        <p className="break-all text-sm mb-4">ลิงก์สรุป: <a className="underline" href={summaryUrl}>{summaryUrl}</a></p>
      ) : null}

      <Link href={`/pets/${id}/chat`} className="underline opacity-80">กลับไปแชท</Link>
      <p className="text-xs opacity-70 mt-6">{t.disclaimer}</p>
    </div>
  );
}
