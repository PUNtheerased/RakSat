'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, PawPrint, X } from 'lucide-react';
import { ZonePill } from '@/components/ZonePill';
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, proposals]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!token || !text.trim() || busy) return;
    const message = text.trim();
    setText('');
    setBusy(true);
    setErr('');
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
    <main className="min-h-dvh px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-[640px] animate-enter flex min-h-[calc(100dvh-2.5rem)] flex-col">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] bg-white"
              aria-label="Back"
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div>
              <h1 className="font-bold text-[var(--forest)]">RakSat</h1>
              <p className="text-xs text-[var(--muted)]">{t.chatCta}</p>
            </div>
          </div>
          {zone ? <ZonePill zone={zone} /> : <span className="w-11" />}
        </header>

        {watchFor.length ? (
          <div className="mb-4 rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber-bg)] p-3">
            <p className="mb-2 text-xs font-bold text-[var(--amber)]">{t.zoneYellow}</p>
            <ul className="space-y-1 text-xs leading-5 text-[#75501e] list-disc pl-4">
              {watchFor.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="flex-1 space-y-4 pb-4" aria-live="polite">
          {msgs.length === 0 ? <p className="text-sm text-[var(--muted)]">{t.empty}</p> : null}
          {msgs.map((m, i) => (
            m.role === 'user' ? (
              <div key={m.id ?? i} className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-[var(--forest)] p-3 text-sm leading-6 text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id ?? i} className="flex gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--forest)] text-white">
                  <PawPrint size={16} aria-hidden />
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-6 shadow-sm border border-[var(--line)]">
                  {m.content}
                </div>
              </div>
            )
          ))}
          <div ref={endRef} />
        </div>

        {proposals.map((p) => (
          <div key={p.id} className="card mb-3 border-[var(--leaf)]/30">
            <p className="mb-3 text-sm font-semibold">{p.preview}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary flex-1" onClick={() => resolveProposal(p.id, 'confirm')}>
                <Check size={15} aria-hidden /> {t.confirm}
              </button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => resolveProposal(p.id, 'reject')}>
                <X size={15} aria-hidden /> {t.reject}
              </button>
            </div>
          </div>
        ))}

        {sessionId ? (
          <div className="flex gap-2 mb-3">
            <button type="button" className="btn btn-ghost flex-1" onClick={() => rate(1)}>{t.helpfulYes}</button>
            <button type="button" className="btn btn-ghost flex-1" onClick={() => rate(-1)}>{t.helpfulNo}</button>
          </div>
        ) : null}

        {err ? <p className="text-[var(--coral)] mb-2 text-sm" role="alert">{err}</p> : null}

        <p className="mb-2 text-center text-[10px] text-[var(--muted)]">{t.disclaimer}</p>
        <form onSubmit={send} className="flex gap-2 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-sm">
          <input
            className="h-10 flex-1 bg-transparent px-2 text-sm outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.chatCta}
            disabled={busy}
            maxLength={2000}
            aria-label={t.chatCta}
          />
          <button
            type="submit"
            className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--forest)] text-white disabled:opacity-50"
            disabled={busy}
            aria-label="Send"
          >
            <ArrowRight size={17} aria-hidden />
          </button>
        </form>
      </div>
    </main>
  );
}
