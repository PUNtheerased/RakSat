'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bell, ChevronRight, PawPrint, Plus, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

type Pet = { id: string; name: string; species: string };
type Me = {
  consentedAt: string | null;
  activatedAt: string | null;
  requireInvite: boolean;
  suspendedAt: string | null;
  accessUntil: string | null;
  adminRole: string | null;
};

export default function AppHomePage() {
  const { t, locale } = useI18n();
  const { token, loading } = useSession();
  const router = useRouter();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api<Me>('/api/me', { token });
        if (cancelled) return;
        if (!me.consentedAt) {
          router.replace('/consent');
          return;
        }
        if (me.requireInvite && !me.activatedAt) {
          router.replace('/invite');
          return;
        }
        const list = await api<Pet[]>('/api/pets', { token });
        if (cancelled) return;
        setPets(list);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        const code = e instanceof ApiError ? e.code : t.error;
        setErr(code);
        setPets([]);
        setReady(true);
        if (code === 'unauthorized') {
          await createClient().auth.signOut();
          router.replace('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, loading, router, t.error]);

  if (loading || (!ready && !err)) {
    return (
      <AppShell homeHref="/app">
        <p aria-live="polite">{t.loading}</p>
      </AppShell>
    );
  }

  if (err && pets !== null) {
    return (
      <AppShell homeHref="/app" title={t.homeTitle}>
        <p className="text-[var(--coral)] mb-4" role="alert">{err}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {locale === 'th' ? 'ลองใหม่' : 'Retry'}
        </button>
      </AppShell>
    );
  }

  if (!pets) {
    return (
      <AppShell homeHref="/app">
        <p aria-live="polite">{t.loading}</p>
      </AppShell>
    );
  }

  const firstPet = pets[0];

  return (
    <AppShell homeHref="/app" showDisclaimer>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">{t.homeTitle}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[var(--forest)]">
            {locale === 'th' ? 'วันนี้น้องเป็นอย่างไรบ้าง?' : 'How is your pet today?'}
          </h1>
        </div>
        <Link
          href="/reminders"
          aria-label={t.reminders}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--forest)]"
        >
          <Bell size={18} aria-hidden />
        </Link>
      </header>

      <section className="mb-6 rounded-3xl bg-[var(--forest)] p-5 text-white">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="text-xs text-white/60">
              {locale === 'th' ? 'เล่าอาการให้ RakSat ช่วยดู' : 'Describe symptoms for triage'}
            </p>
            <h2 className="mt-1 text-[22px] font-bold leading-tight">
              {locale === 'th' ? <>น้องมีอาการผิดปกติ<br />เริ่มประเมินได้เลย</> : <>Something feels wrong<br />Start a triage chat</>}
            </h2>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <Sparkles size={18} className="text-[#c2e0c7]" aria-hidden />
          </div>
        </div>
        {firstPet ? (
          <Link
            href={`/pets/${firstPet.id}/chat`}
            className="btn w-full bg-[#d6ebd9] text-[var(--forest)] hover:bg-white"
          >
            {t.chatCta} <ArrowRight size={16} aria-hidden />
          </Link>
        ) : (
          <Link href="/pets/new" className="btn w-full bg-[#d6ebd9] text-[var(--forest)] hover:bg-white">
            {t.addPet} <Plus size={16} aria-hidden />
          </Link>
        )}
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-[var(--forest)]">{t.homeTitle}</h2>
        <Link href="/pets/new" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--leaf)] min-h-11">
          <Plus size={15} aria-hidden /> {t.addPet}
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="card space-y-4">
          <p className="text-[var(--muted)]">{t.empty}</p>
          <Link href="/pets/new" className="btn btn-primary w-full">{t.addPet}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pets.map((p) => (
            <li key={p.id} className="card">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e7d8bf] text-[var(--forest)]">
                  <PawPrint size={28} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{p.name}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {p.species === 'dog' ? (locale === 'th' ? 'สุนัข' : 'Dog') : (locale === 'th' ? 'แมว' : 'Cat')}
                  </p>
                </div>
                <ChevronRight size={18} className="text-[var(--muted)]" aria-hidden />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Link href={`/pets/${p.id}/chat`} className="btn btn-primary w-full">
                  {t.chatCta}
                </Link>
                <Link href={`/pets/${p.id}/clinics`} className="btn btn-ghost w-full">
                  {t.clinicsManage}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link href="/reminders" className="btn btn-ghost w-full">
          <Bell size={16} aria-hidden /> {t.reminders}
        </Link>
      </div>
    </AppShell>
  );
}
