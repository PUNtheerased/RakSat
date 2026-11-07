import { createHash, randomBytes } from 'node:crypto';
import { q } from './db.js';
import { getConfigNumber } from './access.js';

export function hashInviteCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/** รูปแบบ RAK-XXXX-XXXX (ตัวอักษร/ตัวเลข ไม่สับสน 0/O/1/I) */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) => Array.from({ length: n }, () => alphabet[randomBytes(1)[0]! % alphabet.length]).join('');
  return `RAK-${part(4)}-${part(4)}`;
}

export async function tooManyInviteAttempts(ownerId: string, ip: string | undefined): Promise<boolean> {
  const [byOwner] = await q<{ n: string }>(
    `select count(*) n from invite_attempts where owner_id=$1 and ok=false and at > now() - interval '15 minutes'`, [ownerId]);
  if (Number(byOwner?.n ?? 0) >= 10) return true;
  if (ip) {
    const [byIp] = await q<{ n: string }>(
      `select count(*) n from invite_attempts where ip=$1 and ok=false and at > now() - interval '15 minutes'`, [ip]);
    if (Number(byIp?.n ?? 0) >= 30) return true;
  }
  return false;
}

export async function redeemInvite(ownerId: string, code: string, ip?: string): Promise<
  { ok: true; accessUntil: string } | { ok: false; error: string }
> {
  if (await tooManyInviteAttempts(ownerId, ip)) {
    await q(`insert into invite_attempts(owner_id,ip,ok) values($1,$2,false)`, [ownerId, ip ?? null]);
    return { ok: false, error: 'too_many_attempts' };
  }
  const hash = hashInviteCode(code);
  const [key] = await q<{
    id: string; max_uses: number; used_count: number; expires_at: Date | null; revoked_at: Date | null; daily_limit: number | null;
  }>(`select id, max_uses, used_count, expires_at, revoked_at, daily_limit from invite_keys where code_hash=$1`, [hash]);
  if (!key || key.revoked_at || (key.expires_at && new Date(key.expires_at) < new Date()) || key.used_count >= key.max_uses) {
    await q(`insert into invite_attempts(owner_id,ip,ok) values($1,$2,false)`, [ownerId, ip ?? null]);
    return { ok: false, error: 'invalid_or_expired' };
  }
  const trialDays = await getConfigNumber('trial_days', 14);
  const updated = await q<{ id: string }>(
    `update invite_keys set used_count = used_count + 1
     where id=$1 and used_count < max_uses and revoked_at is null
       and (expires_at is null or expires_at > now())
     returning id`, [key.id]);
  if (!updated.length) {
    await q(`insert into invite_attempts(owner_id,ip,ok) values($1,$2,false)`, [ownerId, ip ?? null]);
    return { ok: false, error: 'invalid_or_expired' };
  }
  const [owner] = await q<{ access_until: Date }>(
    `update owners set invite_key_id=$2, activated_at=coalesce(activated_at, now()),
      access_until=coalesce(access_until, now() + ($3 || ' days')::interval), suspended_at=null
     where id=$1 returning access_until`,
    [ownerId, key.id, String(trialDays)]);
  await q(`insert into invite_attempts(owner_id,ip,ok) values($1,$2,true)`, [ownerId, ip ?? null]);
  return { ok: true, accessUntil: owner!.access_until.toISOString() };
}
