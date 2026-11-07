import { q } from './db.js';

export type AccessBlock = 'invite_required' | 'trial_expired' | 'suspended' | 'llm_paused' | null;

export interface OwnerAccess {
  id: string;
  consented_at: Date | null;
  consent_version: string | null;
  invite_key_id: string | null;
  activated_at: Date | null;
  access_until: Date | null;
  suspended_at: Date | null;
  display_name: string | null;
  line_user_id: string | null;
}

export async function getConfigBool(key: string, fallback = false): Promise<boolean> {
  const [r] = await q<{ value: unknown }>(`select value from app_config where key=$1`, [key]);
  if (!r) return fallback;
  return r.value === true || r.value === 'true';
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const [r] = await q<{ value: unknown }>(`select value from app_config where key=$1`, [key]);
  if (r == null) return fallback;
  const n = Number(r.value);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadOwner(ownerId: string): Promise<OwnerAccess | null> {
  const [o] = await q<OwnerAccess>(
    `select id, consented_at, consent_version, invite_key_id, activated_at, access_until, suspended_at, display_name, line_user_id
     from owners where id=$1`, [ownerId]);
  return o ?? null;
}

/** บล็อกเส้นทาง LLM เท่านั้น — ฉุกเฉิน/โซนแดงไม่เรียกฟังก์ชันนี้ */
export async function llmAccessBlock(owner: OwnerAccess): Promise<AccessBlock> {
  if (owner.suspended_at) return 'suspended';
  const requireInvite = await getConfigBool('require_invite', true);
  if (requireInvite && !owner.activated_at) return 'invite_required';
  if (!requireInvite && !owner.activated_at) {
    // เปิดสมัครได้ — activate อัตโนมัติครั้งแรกที่เข้าแชตจะทำใน redeem/ensure
  }
  if (owner.access_until && new Date(owner.access_until) < new Date()) return 'trial_expired';
  if (await getConfigBool('llm_paused', false)) return 'llm_paused';
  return null;
}

export async function ensureOpenSignupActivated(ownerId: string): Promise<void> {
  const requireInvite = await getConfigBool('require_invite', true);
  if (requireInvite) return;
  const trialDays = await getConfigNumber('trial_days', 14);
  await q(
    `update owners set activated_at=coalesce(activated_at, now()),
      access_until=coalesce(access_until, now() + ($2 || ' days')::interval)
     where id=$1 and activated_at is null`,
    [ownerId, String(trialDays)]);
}

/** ไม่จำกัดรายวันเป็นค่าเริ่มต้น (โมเดลฟรี) — มีเพดานเฉพาะเมื่อ invite key กำหนด daily_limit */
export async function dailyLimitFor(owner: OwnerAccess): Promise<number | null> {
  if (!owner.invite_key_id) return null;
  const [k] = await q<{ daily_limit: number | null }>(`select daily_limit from invite_keys where id=$1`, [owner.invite_key_id]);
  return k?.daily_limit ?? null;
}
