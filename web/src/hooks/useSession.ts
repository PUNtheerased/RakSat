'use client';
import { useEffect, useState } from 'react';
import { createClient, getSupabaseConfig } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!getSupabaseConfig().configured) {
      setConfigError(true);
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      supabase.auth.getSession()
        .then(({ data }) => { setSession(data.session); })
        .catch(() => { setSession(null); })
        .finally(() => { setLoading(false); });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => sub.subscription.unsubscribe();
    } catch {
      setConfigError(true);
      setLoading(false);
    }
  }, []);

  return {
    session,
    token: session?.access_token ?? null,
    loading,
    configError,
  };
}
