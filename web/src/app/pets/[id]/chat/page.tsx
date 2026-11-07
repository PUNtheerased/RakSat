'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError, type AgentResult } from '@/lib/api';

type Msg = { id?: string; role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { token } = useSession();
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [proposals, setProposals] = useState<AgentResult['proposals']>([]);
  const [zone, setZone] = useState<AgentResult['zone']>(null);
  const [watchFor, setWatchFor] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api<{ id: string; role: 'user' | 'assistant'; content: string }[]>(`/api/pets/${id}/messages`, { token })
      .then((m) => setMsgs(m.map((x) => ({ id: x.id, role: x.role, content: x.content }))))
      .catch(() => setMsgs([]));
  }, [token, id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, proposals]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!token || !text.trim() || busy) return;
    const message = text.trim();
    setText(''); setBusy(true); setErr('');
    setMsgs((m) => [...m, { role: 'user', content: message }]);
    try {
      let location: { lat: number; lng: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 }));
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* optional */ }

      const res = await api<AgentResult>('/api/chat', { token, body: { petId: id, message, location } });
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply }]);
      setProposals(res.proposals);
      setZone(res.zone);
      setWatchFor(res.watchFor);
      setSessionId(res.sessionId);
      if (res.emergency) {
        sessionStorage.setItem(`raksat_emergency_${id}`, JSON.stringify(res));
        router.push(`/pets/${id}/emergency`);
      }
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'error';
      if (code === 'consent_required') router.replace('/consent');
      else if (code === 'invite_required') router.replace('/invite');
      else if (code === 'daily_limit') setErr(t.dailyLimit);
      else setErr(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function resolveProposal(pid: string, action: 'confirm' | 'reject') {
    if (!token) return;
    await api(`/api/actions/${pid}/${action}`, { token, method: 'POST', body: {} });
    setProposals((p) => p.filter((x) => x.id !== pid));
  }

  async function rate(rating: 1 | -1) {
    if (!token || !sessionId) return;
    await api('/api/feedback', { token, body: { triageSessionId: sessionId, rating } });
  }

  return (
    <AppShell title="แชท">
      {zone ? (
        <div className={`zone-pill zone-${zone} mb-3`} role="status">
          <span aria-hidden>{zone === 'red' ? '!' : zone === 'yellow' ? '▲' : '●'}</span>
          {zone === 'green' ? t.zoneGreen : zone === 'yellow' ? t.zoneYellow : t.zoneRed}
        </div>
      ) : null}
      {watchFor.length ? (
        <ul className="card mb-3 text-sm list-disc pl-5">
          {watchFor.map((w) => <li key={w}>{w}</li>)}
        </ul>
      ) : null}

      <div className="space-y-3 mb-4" aria-live="polite">
        {msgs.length === 0 ? <p className="text-[var(--muted)]">{t.empty}</p> : null}
        {msgs.map((m, i) => (
          <div key={m.id ?? i} className={`card ${m.role === 'user' ? 'bg-[var(--brand)] text-[var(--brand-ink)] border-transparent' : ''}`}>
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {proposals.map((p) => (
        <div key={p.id} className="card mb-3 border-[var(--brand)]">
          <p className="mb-3">{p.preview}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary flex-1" onClick={() => resolveProposal(p.id, 'confirm')}>{t.confirm}</button>
            <button type="button" className="btn btn-ghost flex-1" onClick={() => resolveProposal(p.id, 'reject')}>{t.reject}</button>
          </div>
        </div>
      ))}

      {sessionId ? (
        <div className="flex gap-2 mb-4">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => rate(1)} aria-label="helpful">ช่วยได้</button>
          <button type="button" className="btn btn-ghost flex-1" onClick={() => rate(-1)} aria-label="not helpful">ยังไม่ตรง</button>
        </div>
      ) : null}

      {err ? <p className="text-[var(--danger)] mb-2" role="alert">{err}</p> : null}
      <form onSubmit={send} className="flex gap-2 sticky bottom-3">
        <input
          className="flex-1 min-h-11 rounded-xl border border-[var(--line)] px-3 bg-[var(--card)]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เล่าอาการ…"
          disabled={busy}
          maxLength={2000}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'ส่ง'}</button>
      </form>
      <p className="text-xs text-[var(--muted)] mt-2">{t.disclaimer}</p>
    </AppShell>
  );
}
