import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { q } from './db.js';
import { verifyAccessToken } from './auth.js';
import { AccessError, LimitError, NotFoundError, runAgent } from './agent/agent.js';
import { executeAction, payloadSchemas, type ActionKind } from './agent/actions.js';
import { findClinics, findClinicsGeneral } from './agent/places.js';
import { pushLine } from './reminders/channels.js';
import { buildReferralSummary } from './referral/summary.js';
import { getConfigBool, getConfigNumber, loadOwner } from './access.js';
import { generateInviteCode, hashInviteCode, redeemInvite } from './invite.js';
import { audit, requireAdmin } from './admin.js';
import { pendingSurveys } from './survey.js';
import type { PetRow } from './types.js';

declare module 'fastify' { interface FastifyRequest { ownerId: string } }

const app = Fastify({ logger: true });
const CONSENT_VERSION = '2026-11-v1';

await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
app.decorateRequest('ownerId', '');
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try { (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer; done(null, JSON.parse((body as Buffer).toString('utf8') || '{}')); }
  catch (e) { done(e as Error, undefined); }
});

app.addHook('onRequest', async (req, reply) => {
  if (!req.url.startsWith('/api/')) return;
  if (req.url.startsWith('/api/public')) return;
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return reply.code(401).send({ error: 'unauthorized' });
  try {
    req.ownerId = await verifyAccessToken(h.slice(7));
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  try {
    await q(`insert into owners(id) values($1) on conflict do nothing`, [req.ownerId]);
  } catch (e) {
    req.log.error(e);
    return reply.code(503).send({ error: 'database_unavailable' });
  }
});

app.get('/health', async () => ({ ok: true }));

// ---------- me ----------
app.get('/api/me', async (req) => {
  const o = await loadOwner(req.ownerId);
  const requireInvite = await getConfigBool('require_invite', true);
  const trialDays = await getConfigNumber('trial_days', 14);
  const role = await requireAdmin(req.ownerId);
  return {
    id: req.ownerId,
    displayName: o?.display_name ?? null,
    consentVersion: o?.consent_version ?? null,
    consentedAt: o?.consented_at ?? null,
    activatedAt: o?.activated_at ?? null,
    accessUntil: o?.access_until ?? null,
    suspendedAt: o?.suspended_at ?? null,
    hasLine: !!o?.line_user_id,
    requireInvite,
    trialDays,
    adminRole: role,
  };
});

app.delete('/api/me', async (req) => {
  await q(`delete from owners where id=$1`, [req.ownerId]);
  return { ok: true };
});

app.post('/api/consent', async (req) => {
  await q(`update owners set consent_version=$2, consented_at=now() where id=$1`, [req.ownerId, CONSENT_VERSION]);
  return { consentVersion: CONSENT_VERSION };
});

// ---------- invite ----------
app.post('/api/invite/redeem', async (req, reply) => {
  const b = z.object({ code: z.string().min(6).max(32) }).parse(req.body);
  const ip = req.ip;
  const r = await redeemInvite(req.ownerId, b.code, ip);
  if (!r.ok) return reply.code(400).send({ error: r.error });
  return { ok: true, accessUntil: r.accessUntil };
});

// ---------- pets ----------
const PetBody = z.object({
  name: z.string().min(1).max(60), species: z.enum(['dog', 'cat']), breed: z.string().max(80).optional(),
  birthDate: z.string().date().optional(), sex: z.enum(['male', 'female']).optional(), neutered: z.boolean().optional(),
  weightKg: z.number().positive().max(100).optional(),
  conditions: z.array(z.string().max(80)).max(20).default([]), allergies: z.array(z.string().max(80)).max(20).default([]),
});
app.post('/api/pets', async (req, reply) => {
  const b = PetBody.parse(req.body);
  const [p] = await q(`insert into pets(owner_id,name,species,breed,birth_date,sex,neutered,weight_kg,conditions,allergies)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [req.ownerId, b.name, b.species, b.breed ?? null, b.birthDate ?? null, b.sex ?? null, b.neutered ?? null, b.weightKg ?? null, b.conditions, b.allergies]);
  return reply.code(201).send(p);
});
app.get('/api/pets', async (req) => q(`select * from pets where owner_id=$1 order by created_at`, [req.ownerId]));

async function ownedPet(petId: string, ownerId: string) {
  const [p] = await q<PetRow>(`select * from pets where id=$1 and owner_id=$2`, [petId, ownerId]);
  return p ?? null;
}

// ---------- pet clinics ----------
app.get('/api/pets/:id/clinics', async (req, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  if (!(await ownedPet(id, req.ownerId))) return reply.code(404).send({ error: 'pet_not_found' });
  return q(`select * from pet_clinics where pet_id=$1 order by is_primary desc, created_at`, [id]);
});
app.post('/api/pets/:id/clinics', async (req, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  if (!(await ownedPet(id, req.ownerId))) return reply.code(404).send({ error: 'pet_not_found' });
  const b = z.object({
    placeId: z.string().min(1).max(256), label: z.string().min(1).max(120),
    isPrimary: z.boolean().optional(), note: z.string().max(200).optional(),
  }).parse(req.body);
  if (b.isPrimary) await q(`update pet_clinics set is_primary=false where pet_id=$1`, [id]);
  const [row] = await q(
    `insert into pet_clinics(pet_id,place_id,label,is_primary,note) values($1,$2,$3,$4,$5)
     on conflict (pet_id, place_id) do update set label=excluded.label, note=excluded.note,
       is_primary=excluded.is_primary returning *`,
    [id, b.placeId, b.label, b.isPrimary ?? false, b.note ?? null]);
  return reply.code(201).send(row);
});
app.patch('/api/pets/:id/clinics/:clinicId', async (req, reply) => {
  const { id, clinicId } = z.object({ id: z.string().uuid(), clinicId: z.string().uuid() }).parse(req.params);
  if (!(await ownedPet(id, req.ownerId))) return reply.code(404).send({ error: 'pet_not_found' });
  const b = z.object({ label: z.string().min(1).max(120).optional(), isPrimary: z.boolean().optional(), note: z.string().max(200).nullable().optional() }).parse(req.body);
  if (b.isPrimary) await q(`update pet_clinics set is_primary=false where pet_id=$1`, [id]);
  const [row] = await q(
    `update pet_clinics set
      label=coalesce($3,label), note=coalesce($4,note),
      is_primary=coalesce($5,is_primary)
     where id=$1 and pet_id=$2 returning *`,
    [clinicId, id, b.label ?? null, b.note === undefined ? null : b.note, b.isPrimary ?? null]);
  return row ? row : reply.code(404).send({ error: 'not_found' });
});
app.delete('/api/pets/:id/clinics/:clinicId', async (req, reply) => {
  const { id, clinicId } = z.object({ id: z.string().uuid(), clinicId: z.string().uuid() }).parse(req.params);
  if (!(await ownedPet(id, req.ownerId))) return reply.code(404).send({ error: 'pet_not_found' });
  const r = await q(`delete from pet_clinics where id=$1 and pet_id=$2 returning id`, [clinicId, id]);
  return r.length ? { ok: true } : reply.code(404).send({ error: 'not_found' });
});

// ---------- messages ----------
app.get('/api/pets/:id/messages', async (req, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  if (!(await ownedPet(id, req.ownerId))) return reply.code(404).send({ error: 'pet_not_found' });
  const limit = z.object({ limit: z.coerce.number().min(1).max(200).default(100) }).parse(req.query).limit;
  return q(
    `select id, role, content, created_at from messages where pet_id=$1 and owner_id=$2 order by created_at asc limit $3`,
    [id, req.ownerId, limit]);
});

// ---------- chat ----------
const ChatBody = z.object({
  petId: z.string().uuid(), message: z.string().min(1).max(2000),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});
app.post('/api/chat', async (req, reply) => {
  const b = ChatBody.parse(req.body);
  const [o] = await q<{ consented_at: Date | null }>(`select consented_at from owners where id=$1`, [req.ownerId]);
  if (!o?.consented_at) return reply.code(403).send({ error: 'consent_required' });
  try {
    return await runAgent({ ownerId: req.ownerId, ...b });
  } catch (e) {
    if (e instanceof NotFoundError) return reply.code(404).send({ error: 'pet_not_found' });
    if (e instanceof LimitError) return reply.code(429).send({ error: 'daily_limit', message: 'วันนี้คุยครบโควตาแล้ว (กรณีฉุกเฉินยังใช้ได้เสมอ)' });
    if (e instanceof AccessError) return reply.code(403).send({ error: e.code });
    throw e;
  }
});

// ---------- confirm / reject ----------
async function resolve(req: { ownerId: string; params: unknown }, status: 'confirmed' | 'rejected') {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const [a] = await q<{ id: string; kind: ActionKind; payload: unknown; pet_id: string }>(
    `update pending_actions set status=$3, resolved_at=now()
      where id=$1 and owner_id=$2 and status='pending' and expires_at > now() returning id, kind, payload, pet_id`,
    [id, req.ownerId, status]);
  return a ?? null;
}
app.post('/api/actions/:id/confirm', async (req, reply) => {
  const a = await resolve(req as never, 'confirmed');
  if (!a) return reply.code(404).send({ error: 'not_found_or_expired' });
  const [pet] = await q<PetRow>(`select * from pets where id=$1`, [a.pet_id]);
  payloadSchemas[a.kind].parse(a.payload);
  return { kind: a.kind, result: await executeAction(a.kind, a.payload, pet!) };
});
app.post('/api/actions/:id/reject', async (req, reply) => {
  const a = await resolve(req as never, 'rejected');
  return a ? { ok: true } : reply.code(404).send({ error: 'not_found_or_expired' });
});

// ---------- referrals (owner-initiated, e.g. emergency) ----------
app.post('/api/referrals', async (req, reply) => {
  const b = z.object({ petId: z.string().uuid(), clinicPlaceId: z.string().max(256).optional() }).parse(req.body);
  const pet = await ownedPet(b.petId, req.ownerId);
  if (!pet) return reply.code(404).send({ error: 'pet_not_found' });
  const summary = await buildReferralSummary(pet);
  const token = randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + 48 * 3600_000);
  await q(`insert into referrals(owner_id,pet_id,token,summary,clinic_place_id,expires_at) values($1,$2,$3,$4,$5,$6)`,
    [req.ownerId, pet.id, token, JSON.stringify(summary), b.clinicPlaceId ?? null, expires.toISOString()]);
  return { url: `${config.PUBLIC_BASE_URL}/r/${token}`, expiresAt: expires.toISOString() };
});

// ---------- clinics search ----------
app.get('/api/clinics', async (req, reply) => {
  const qy = z.object({
    lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180),
    mode: z.enum(['emergency', 'general']).default('emergency'),
  }).parse(req.query);
  try {
    const clinics = qy.mode === 'general'
      ? await findClinicsGeneral({ lat: qy.lat, lng: qy.lng })
      : await findClinics({ lat: qy.lat, lng: qy.lng }, true);
    return { clinics };
  } catch (e) {
    app.log.error(e);
    return reply.code(502).send({ error: 'places_unavailable' });
  }
});

// ---------- timeline / reminders / feedback ----------
app.get('/api/pets/:id/timeline', async (req) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const events = await q(`select e.id,e.kind,e.value,e.note,e.occurred_at,e.source from pet_events e join pets p on p.id=e.pet_id
    where e.pet_id=$1 and p.owner_id=$2 order by e.occurred_at desc limit 200`, [id, req.ownerId]);
  const triage = await q(`select id,zone,reasons,watch_for,created_at from triage_sessions where pet_id=$1 and owner_id=$2 order by created_at desc limit 50`, [id, req.ownerId]);
  return { events, triage };
});
app.get('/api/reminders', async (req) => q(`select * from reminders where owner_id=$1 and active order by next_run_at`, [req.ownerId]));
app.delete('/api/reminders/:id', async (req, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const r = await q(`update reminders set active=false where id=$1 and owner_id=$2 returning id`, [id, req.ownerId]);
  return r.length ? { ok: true } : reply.code(404).send({ error: 'not_found' });
});
app.post('/api/feedback', async (req) => {
  const b = z.object({ triageSessionId: z.string().uuid().optional(), rating: z.union([z.literal(1), z.literal(-1)]), note: z.string().max(500).optional() }).parse(req.body);
  await q(`insert into feedback(owner_id,triage_session_id,rating,note) values($1,$2,$3,$4)`, [req.ownerId, b.triageSessionId ?? null, b.rating, b.note ?? null]);
  return { ok: true };
});

// ---------- surveys ----------
app.get('/api/surveys/pending', async (req) => ({ items: await pendingSurveys(req.ownerId) }));
app.post('/api/surveys/:trigger/snooze', async (req, reply) => {
  const { trigger } = z.object({ trigger: z.string() }).parse(req.params);
  const [s] = await q<{ snoozed_count: number }>(
    `insert into survey_snoozes(owner_id,trigger,snoozed_count,snoozed_until)
     values($1,$2,1,now()+interval '24 hours')
     on conflict (owner_id,trigger) do update set
       snoozed_count = survey_snoozes.snoozed_count + 1,
       snoozed_until = now()+interval '24 hours'
     where survey_snoozes.snoozed_count < 2
     returning snoozed_count`, [req.ownerId, trigger]);
  if (!s) return reply.code(400).send({ error: 'snooze_exhausted' });
  return { snoozedCount: s.snoozed_count };
});
app.post('/api/surveys/:trigger', async (req) => {
  const { trigger } = z.object({ trigger: z.string() }).parse(req.params);
  const b = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(req.body);
  const existing = await q(`select id from survey_responses where owner_id=$1 and trigger=$2 and answers <> '{}'::jsonb`, [req.ownerId, trigger]);
  if (!existing.length) {
    await q(`insert into survey_responses(owner_id,trigger,answers) values($1,$2,$3)`,
      [req.ownerId, trigger, JSON.stringify(b.answers)]);
  }
  return { ok: true };
});

// ---------- channels ----------
app.post('/api/channels/webpush', async (req) => {
  const b = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).parse(req.body);
  await q(`insert into push_subscriptions(owner_id,endpoint,keys) values($1,$2,$3)
    on conflict (endpoint) do update set owner_id=excluded.owner_id, keys=excluded.keys`, [req.ownerId, b.endpoint, JSON.stringify(b.keys)]);
  return { ok: true };
});
app.get('/api/channels/webpush/key', async () => ({ publicKey: config.VAPID_PUBLIC_KEY ?? null }));
app.post('/api/channels/line/link-code', async (req) => {
  const code = String(randomInt(100000, 1000000));
  await q(`insert into link_codes(code,owner_id,expires_at) values($1,$2,now() + interval '10 minutes')`, [code, req.ownerId]);
  return { code, expiresInMinutes: 10, instruction: 'พิมพ์รหัสนี้ส่งใน LINE Official Account ของ RakSat' };
});

app.post('/line/webhook', async (req, reply) => {
  if (!config.LINE_CHANNEL_SECRET) return reply.code(503).send();
  const raw = (req as unknown as { rawBody: Buffer }).rawBody;
  const expected = createHmac('sha256', config.LINE_CHANNEL_SECRET).update(raw).digest();
  const given = Buffer.from(String(req.headers['x-line-signature'] ?? ''), 'base64');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return reply.code(401).send();
  const body = req.body as { events?: { type: string; message?: { type: string; text: string }; source?: { userId?: string } }[] };
  for (const ev of body.events ?? []) {
    const text = ev.message?.type === 'text' ? ev.message.text.trim() : '';
    const uid = ev.source?.userId;
    if (!uid || !/^\d{6}$/.test(text)) continue;
    const [lc] = await q<{ owner_id: string }>(`delete from link_codes where code=$1 and expires_at > now() returning owner_id`, [text]);
    if (!lc) { await pushLine(uid, 'รหัสไม่ถูกต้องหรือหมดอายุแล้วค่ะ ขอรหัสใหม่ในแอปได้เลย'); continue; }
    await q(`update owners set line_user_id=$2 where id=$1`, [lc.owner_id, uid]);
    await pushLine(uid, 'เชื่อมต่อ LINE กับ RakSat เรียบร้อยแล้วค่ะ จากนี้ระบบจะส่งการเตือนมาที่นี่');
  }
  return { ok: true };
});

// ---------- public referral ----------
app.get('/public/referrals/:token', async (req, reply) => {
  const { token } = z.object({ token: z.string().min(20).max(64) }).parse(req.params);
  const [r] = await q<{ id: string; summary: unknown; expires_at: Date }>(
    `select id, summary, expires_at from referrals where token=$1 and expires_at > now()`, [token]);
  if (!r) return reply.code(404).send({ error: 'not_found_or_expired' });
  await q(`insert into referral_views(referral_id) values($1)`, [r.id]);
  return reply
    .header('Cache-Control', 'no-store')
    .header('Referrer-Policy', 'no-referrer')
    .header('X-Robots-Tag', 'noindex, nofollow')
    .send({ summary: r.summary, expiresAt: r.expires_at });
});
app.post('/public/referrals/:token/feedback', async (req, reply) => {
  const { token } = z.object({ token: z.string().min(20).max(64) }).parse(req.params);
  const b = z.object({ helpful: z.boolean(), note: z.string().max(500).optional() }).parse(req.body);
  const [r] = await q<{ id: string }>(`select id from referrals where token=$1 and expires_at > now()`, [token]);
  if (!r) return reply.code(404).send({ error: 'not_found_or_expired' });
  await q(`insert into referral_feedback(referral_id,helpful,note) values($1,$2,$3)`, [r.id, b.helpful, b.note ?? null]);
  return { ok: true };
});

// ---------- admin ----------
app.get('/api/admin/dashboard', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const [active] = await q<{ n: string }>(`select count(*) n from owners where activated_at is not null and suspended_at is null`);
  const [ret7] = await q<{ n: string }>(
    `select count(distinct owner_id) n from messages where created_at > now() - interval '7 days'`);
  const zones = await q<{ zone: string; n: string }>(
    `select zone, count(*) n from triage_sessions where created_at > now() - interval '30 days' group by zone`);
  const [down] = await q<{ n: string }>(`select count(*) n from feedback where rating=-1 and created_at > now() - interval '30 days'`);
  const [up] = await q<{ n: string }>(`select count(*) n from feedback where rating=1 and created_at > now() - interval '30 days'`);
  const [sent] = await q<{ n: string }>(`select count(*) n from reminder_deliveries where status='sent' and sent_at > now() - interval '30 days'`);
  const [helpful] = await q<{ n: string }>(`select count(*) n from referral_feedback where helpful=true`);
  const llm = await q<{ day: string; input: string; output: string }>(
    `select date_trunc('day', at)::date::text as day, sum(input_tokens)::text as input, sum(output_tokens)::text as output
     from llm_usage where at > now() - interval '14 days' group by 1 order by 1`);
  return {
    activatedOwners: Number(active?.n ?? 0),
    returned7d: Number(ret7?.n ?? 0),
    zones: Object.fromEntries(zones.map((z) => [z.zone, Number(z.n)])),
    feedbackDown: Number(down?.n ?? 0), feedbackUp: Number(up?.n ?? 0),
    remindersSent: Number(sent?.n ?? 0), referralHelpful: Number(helpful?.n ?? 0),
    llmByDay: llm,
  };
});

app.get('/api/admin/config', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  return q(`select key, value from app_config order by key`);
});
app.patch('/api/admin/config', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const b = z.object({ key: z.string(), value: z.unknown() }).parse(req.body);
  await q(`insert into app_config(key,value) values($1,$2) on conflict (key) do update set value=excluded.value`,
    [b.key, JSON.stringify(b.value)]);
  await audit(req.ownerId, 'config_update', b.key, { value: b.value });
  return { ok: true };
});

app.get('/api/admin/invites', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  return q(`select id, label, cohort, max_uses, used_count, expires_at, daily_limit, revoked_at, created_at from invite_keys order by created_at desc`);
});
app.post('/api/admin/invites', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const b = z.object({
    label: z.string().max(80).optional(), cohort: z.string().max(40).optional(),
    maxUses: z.number().int().min(1).max(10000).default(1),
    expiresAt: z.string().datetime().optional(), dailyLimit: z.number().int().positive().optional(),
  }).parse(req.body);
  const code = generateInviteCode();
  const [row] = await q(
    `insert into invite_keys(code_hash,label,cohort,max_uses,expires_at,daily_limit) values($1,$2,$3,$4,$5,$6) returning id`,
    [hashInviteCode(code), b.label ?? null, b.cohort ?? null, b.maxUses, b.expiresAt ?? null, b.dailyLimit ?? null]);
  await audit(req.ownerId, 'invite_create', row!.id, { label: b.label, cohort: b.cohort });
  return { id: row!.id, code }; // รหัสเต็มโชว์ครั้งเดียว
});
app.post('/api/admin/invites/:id/revoke', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  await q(`update invite_keys set revoked_at=now() where id=$1`, [id]);
  await audit(req.ownerId, 'invite_revoke', id);
  return { ok: true };
});

app.get('/api/admin/users', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  return q(
    `select o.id, o.activated_at, o.access_until, o.suspended_at, o.consented_at,
      (select count(*) from messages m where m.owner_id=o.id and m.role='user') as chat_count
     from owners o order by o.created_at desc limit 200`);
});
app.post('/api/admin/users/:id/suspend', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  await q(`update owners set suspended_at=now() where id=$1`, [id]);
  await audit(req.ownerId, 'user_suspend', id);
  return { ok: true };
});
app.post('/api/admin/users/:id/extend', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const b = z.object({ days: z.number().int().min(1).max(365).default(14) }).parse(req.body ?? {});
  await q(`update owners set access_until=greatest(coalesce(access_until,now()), now()) + ($2 || ' days')::interval, suspended_at=null where id=$1`,
    [id, String(b.days)]);
  await audit(req.ownerId, 'user_extend', id, { days: b.days });
  return { ok: true };
});

app.get('/api/admin/review', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId))) return reply.code(403).send({ error: 'forbidden' });
  const reveal = z.object({ reveal: z.coerce.boolean().default(false), reason: z.string().max(200).optional() }).parse(req.query);
  if (reveal.reveal) {
    if (!reveal.reason) return reply.code(400).send({ error: 'reveal_reason_required' });
    await audit(req.ownerId, 'review_reveal_identity', undefined, { reason: reveal.reason });
  }
  const rows = await q<{
    id: string; zone: string; reasons: unknown; watch_for: unknown; input_text: string;
    created_at: Date; review_label: string | null; owner_id: string; pet_id: string; species: string;
  }>(
    `select t.id, t.zone, t.reasons, t.watch_for, t.input_text, t.created_at, t.review_label, t.owner_id, t.pet_id, p.species
     from triage_sessions t join pets p on p.id=t.pet_id
     where t.zone in ('yellow','red') order by t.created_at desc limit 100`);
  return rows.map((r) => ({
    id: r.id, zone: r.zone, reasons: r.reasons, watchFor: r.watch_for, inputText: r.input_text,
    createdAt: r.created_at, reviewLabel: r.review_label, species: r.species,
    ownerId: reveal.reveal ? r.owner_id : undefined,
    petId: reveal.reveal ? r.pet_id : undefined,
  }));
});
app.patch('/api/admin/review/:id', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId))) return reply.code(403).send({ error: 'forbidden' });
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const b = z.object({ label: z.enum(['rule_correct', 'over_alert', 'missed']) }).parse(req.body);
  await q(`update triage_sessions set review_label=$2 where id=$1`, [id, b.label]);
  await audit(req.ownerId, 'review_label', id, { label: b.label });
  return { ok: true };
});
app.get('/api/admin/review/export.csv', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId))) return reply.code(403).send({ error: 'forbidden' });
  const rows = await q<{ id: string; zone: string; reasons: unknown; input_text: string; created_at: Date; review_label: string | null; species: string }>(
    `select t.id, t.zone, t.reasons, t.input_text, t.created_at, t.review_label, p.species
     from triage_sessions t join pets p on p.id=t.pet_id
     where t.zone in ('yellow','red') order by t.created_at desc limit 1000`);
  await audit(req.ownerId, 'review_export');
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ['id,zone,species,review_label,created_at,reasons,input_text'];
  for (const r of rows) {
    lines.push([r.id, r.zone, r.species, r.review_label ?? '', r.created_at.toISOString(),
      esc(JSON.stringify(r.reasons)), esc(r.input_text)].join(','));
  }
  return reply.header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', 'attachment; filename="raksat-review.csv"')
    .send(lines.join('\n'));
});

app.get('/api/admin/feedback', async (req, reply) => {
  if (!(await requireAdmin(req.ownerId, 'admin'))) return reply.code(403).send({ error: 'forbidden' });
  const downs = await q(
    `select f.id, f.rating, f.note, f.created_at, t.zone, t.reasons
     from feedback f left join triage_sessions t on t.id=f.triage_session_id
     where f.rating=-1 order by f.created_at desc limit 100`);
  const surveys = await q(`select id, trigger, answers, created_at from survey_responses where answers <> '{}'::jsonb order by created_at desc limit 100`);
  return { downs, surveys };
});

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof z.ZodError) return reply.code(400).send({ error: 'invalid_input', issues: err.issues });
  app.log.error(err);
  return reply.code(500).send({ error: 'internal_error' });
});

await app.listen({ port: config.PORT, host: '0.0.0.0' });
