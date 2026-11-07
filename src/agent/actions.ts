import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { q } from '../db.js';
import { nextOccurrence } from '../time.js';
import { buildReferralSummary } from '../referral/summary.js';
import { config } from '../config.js';
import type { PetRow } from '../types.js';

export const LogEvent = z.object({
  kind: z.enum(['meal', 'water', 'stool', 'vomit', 'weight', 'medication', 'vaccine', 'symptom', 'note']),
  value: z.record(z.string(), z.unknown()).default({}), note: z.string().max(500).optional(), occurredAt: z.string().datetime().optional(),
});
export const CreateReminder = z.object({
  title: z.string().min(1).max(120), body: z.string().max(300).optional(),
  scheduleType: z.enum(['daily', 'once']),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  at: z.string().datetime().optional(),
}).refine((v) => (v.scheduleType === 'daily' ? !!v.timeOfDay : !!v.at), { message: 'daily ต้องมี timeOfDay, once ต้องมี at' });
export const ScheduleCheckin = z.object({ afterHours: z.number().min(1).max(72), question: z.string().min(1).max(200) });
export const CreateReferral = z.object({ clinicPlaceId: z.string().optional() });

export type ActionKind = 'log_event' | 'create_reminder' | 'schedule_checkin' | 'create_referral';
export const payloadSchemas = {
  log_event: LogEvent, create_reminder: CreateReminder, schedule_checkin: ScheduleCheckin, create_referral: CreateReferral,
} as const;

/** รันหลังเจ้าของกดยืนยันเท่านั้น (ห้ามเรียกจาก agent โดยตรง) */
export async function executeAction(kind: ActionKind, payload: unknown, pet: PetRow): Promise<Record<string, unknown>> {
  const now = new Date();
  switch (kind) {
    case 'log_event': {
      const p = LogEvent.parse(payload);
      await q(`insert into pet_events(pet_id,kind,value,note,occurred_at,source) values($1,$2,$3,$4,$5,'agent')`,
        [pet.id, p.kind, JSON.stringify(p.value), p.note ?? null, p.occurredAt ?? now.toISOString()]);
      return { logged: true };
    }
    case 'create_reminder': {
      const p = CreateReminder.parse(payload);
      const next = p.scheduleType === 'daily' ? nextOccurrence(p.timeOfDay!, now) : new Date(p.at!);
      const [r] = await q<{ id: string }>(
        `insert into reminders(owner_id,pet_id,title,body,schedule_type,time_of_day,next_run_at) values($1,$2,$3,$4,$5,$6,$7) returning id`,
        [pet.owner_id, pet.id, p.title, p.body ?? null, p.scheduleType, p.timeOfDay ?? null, next.toISOString()]);
      return { reminderId: r!.id, nextRunAt: next.toISOString() };
    }
    case 'schedule_checkin': {
      const p = ScheduleCheckin.parse(payload);
      const next = new Date(now.getTime() + p.afterHours * 3600_000);
      const [r] = await q<{ id: string }>(
        `insert into reminders(owner_id,pet_id,kind,title,body,schedule_type,next_run_at) values($1,$2,'checkin',$3,$4,'once',$5) returning id`,
        [pet.owner_id, pet.id, `ถามอาการ${pet.name}อีกครั้ง`, p.question, next.toISOString()]);
      return { reminderId: r!.id, nextRunAt: next.toISOString() };
    }
    case 'create_referral': {
      const p = CreateReferral.parse(payload);
      const summary = await buildReferralSummary(pet);
      const token = randomBytes(24).toString('base64url');
      const expires = new Date(now.getTime() + 48 * 3600_000);
      await q(`insert into referrals(owner_id,pet_id,token,summary,clinic_place_id,expires_at) values($1,$2,$3,$4,$5,$6)`,
        [pet.owner_id, pet.id, token, JSON.stringify(summary), p.clinicPlaceId ?? null, expires.toISOString()]);
      return { url: `${config.PUBLIC_BASE_URL}/r/${token}`, expiresAt: expires.toISOString() };
    }
  }
}
