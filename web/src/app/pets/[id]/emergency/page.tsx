'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, FileText, MapPin, Navigation, Phone, Stethoscope } from 'lucide-react';
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

  const clinics = nearby.length ? nearby : (result?.clinics ?? []);

  return (
    <main className="min-h-dvh bg-[#311f20] px-4 py-6 text-[#fff8f5] sm:px-8">
      <div className="mx-auto max-w-2xl animate-enter">
        <Link
          href={`/pets/${id}/chat`}
          className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-[#f3c7bd]"
        >
          <ArrowLeft size={17} aria-hidden /> กลับไปที่การประเมิน
        </Link>

        <div className="mb-8">
          <div className="mb-5 animate-emergency grid h-14 w-14 place-items-center rounded-2xl bg-[var(--coral)]">
            <AlertTriangle size={26} aria-hidden />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f2b7ab]">RakSat</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t.emergencyTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#e7c9c3]">
            {result?.reply ?? t.loading}
          </p>
        </div>

        {result?.reasons?.length ? (
          <div className="mb-7 rounded-2xl border border-[#a45a52] bg-[#512827] p-4">
            <p className="mb-3 font-bold">เหตุผลสำคัญ</p>
            <ul className="space-y-2 text-sm text-[#f4d8d2]">
              {result.reasons.map((r) => <li key={r}>• {r}</li>)}
            </ul>
          </div>
        ) : null}

        {primary ? (
          <section className="mb-6">
            <p className="mb-3 text-sm font-bold text-[#f3c7bd]">{t.primaryClinic}</p>
            <div className="rounded-2xl bg-[#fff8f5] p-4 text-[#311f20]">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f7ddd7] text-[var(--coral)]">
                  <Stethoscope size={20} aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{primary.label}</p>
                  {primary.note ? <p className="mt-1 text-sm text-[#7a6561]">{primary.note}</p> : null}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger w-full mt-4"
                onClick={() => sendSummary(primary.place_id)}
              >
                <FileText size={15} aria-hidden /> {t.sendSummary}
              </button>
            </div>
          </section>
        ) : null}

        <section className="mb-6">
          <h2 className="mb-3 font-bold text-[#f3c7bd]">{t.nearbyOpen}</h2>
          {clinics.map((c) => (
            <div key={c.id} className="mb-2 rounded-xl border border-white/15 p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm opacity-80">{c.address} · {c.distanceKm} กม.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.phone ? (
                  <a className="btn btn-ghost border-white/20 text-[#fff8f5]" href={`tel:${c.phone}`}>
                    <Phone size={15} aria-hidden /> โทร
                  </a>
                ) : null}
                <a
                  className="btn btn-ghost border-white/20 text-[#fff8f5]"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + c.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={15} aria-hidden /> นำทาง
                </a>
                <button type="button" className="btn btn-danger" onClick={() => sendSummary(c.id)}>
                  <FileText size={15} aria-hidden /> {t.sendSummary}
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost w-full mt-2 border-white/20 text-[#fff8f5]" onClick={loadNearby}>
            <MapPin size={16} aria-hidden /> {t.requestLocation}
          </button>
          {status ? <p className="mt-2 text-sm opacity-80" aria-live="polite">{status}</p> : null}
        </section>

        {!primary ? (
          <button type="button" className="btn btn-danger w-full mb-4" onClick={() => sendSummary()}>
            <FileText size={15} aria-hidden /> {t.sendSummary}
          </button>
        ) : null}

        {summaryUrl ? (
          <p className="break-all text-sm mb-4">
            ลิงก์สรุป:{' '}
            <a className="underline" href={summaryUrl}>{summaryUrl}</a>
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs leading-5 text-[#c9a7a1]">{t.disclaimer}</p>
      </div>
    </main>
  );
}
