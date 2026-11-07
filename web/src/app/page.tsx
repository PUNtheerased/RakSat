'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/components/I18nProvider';
import { useSession } from '@/hooks/useSession';
import { api, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

type Pet = { id: string; name: string; species: string };
type Me = {
  consentedAt: string | null; activatedAt: string | null; requireInvite: boolean;
  suspendedAt: string | null; accessUntil: string | null; adminRole: string | null;
};

export default function HomePage() {
  const { t } = useI18n();
  const { token, loading } = useSession();
  const router = useRouter();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!token) { router.replace('/login'); return; }
    let cancelled = false;
    (async () => {
      try {
        const me = await api<Me>('/api/me', { token });
        if (cancelled) return;
        if (!me.consentedAt) { router.replace('/consent'); return; }
        if (me.requireInvite && !me.activatedAt) { router.replace('/invite'); return; }
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
    return () => { cancelled = true; };
  }, [token, loading, router, t.error]);

  if (loading || (!ready && !err)) {
    return <AppShell><p aria-live="polite">{t.loading}</p></AppShell>;
  }

  if (err && pets !== null) {
    return (
      <AppShell title={t.homeTitle}>
        <p className="text-[var(--danger)] mb-4" role="alert">{err}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>ลองใหม่</button>
      </AppShell>
    );
  }

  if (!pets) {
    return <AppShell><p aria-live="polite">{t.loading}</p></AppShell>;
  }

  return (
    <AppShell title={t.homeTitle}>
      {pets.length === 0 ? (
        <div className="card space-y-4">
          <p className="text-[var(--muted)]">{t.empty}</p>
          <Link href="/pets/new" className="btn btn-primary">{t.addPet}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pets.map((p) => (
            <li key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{p.name}</p>
                  <p className="text-sm text-[var(--muted)]">{p.species === 'dog' ? 'สุนัข / Dog' : 'แมว / Cat'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Link href={`/pets/${p.id}/chat`} className="btn btn-primary w-full">{t.chatCta}</Link>
                <Link href={`/pets/${p.id}/clinics`} className="btn btn-ghost w-full">{t.clinicsManage}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/pets/new" className="btn btn-ghost">{t.addPet}</Link>
        <Link href="/reminders" className="btn btn-ghost">{t.reminders}</Link>
      </div>
    </AppShell>
  );
}
