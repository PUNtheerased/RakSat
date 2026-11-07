import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from './config.js';

const legacySecret = new TextEncoder().encode(config.SUPABASE_JWT_SECRET);

const supabaseUrl = config.SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? (config.DATABASE_URL.includes('sfelvyntwgpiymeohskm')
    ? 'https://sfelvyntwgpiymeohskm.supabase.co'
    : undefined);

const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

/** รองรับทั้ง JWT Signing Keys (JWKS) และ Legacy HS256 secret */
export async function verifyAccessToken(token: string): Promise<string> {
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks);
      if (payload.sub) return payload.sub;
    } catch { /* ลอง legacy ต่อ */ }
  }
  const { payload } = await jwtVerify(token, legacySecret);
  if (!payload.sub) throw new Error('no sub');
  return payload.sub;
}
