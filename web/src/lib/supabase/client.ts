'use client';
import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey && !url.includes('จาก_')),
  };
}

export function createClient() {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) {
    throw new Error('missing_supabase_env');
  }
  return createBrowserClient(url, anonKey);
}
