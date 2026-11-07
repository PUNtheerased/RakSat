import { q } from '../db.js';
import type { PetRow } from '../types.js';

function ageText(birth: string | null): string | null {
  if (!birth) return null;
  const months = Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / (30.44 * 86400_000)));
  return months >= 24 ? `${Math.floor(months / 12)} ปี` : `${months} เดือน`;
}

export interface ReferralSummary {
  generatedAt: string;
  pet: { name: string; species: string; breed: string | null; age: string | null; sex: string | null; neutered: boolean | null;
    weightKg: number | null; conditions: string[]; allergies: string[] };
  triage: { zone: string; reasons: unknown; watchFor: unknown; at: string } | null;
  recentEvents: { kind: string; value: unknown; note: string | null; at: string }[];
  disclaimer: string;
}

/** สรุปสร้างจากข้อมูลในฐานข้อมูลเท่านั้น (LLM ไม่ได้เขียนข้อความอิสระลงในสรุปที่ส่งให้หมอ) */
export async function buildReferralSummary(pet: PetRow): Promise<ReferralSummary> {
  const [t] = await q<{ zone: string; reasons: unknown; watch_for: unknown; created_at: Date }>(
    `select zone, reasons, watch_for, created_at from triage_sessions
     where pet_id=$1 and created_at > now() - interval '48 hours' order by created_at desc limit 1`, [pet.id]);
  const ev = await q<{ kind: string; value: unknown; note: string | null; occurred_at: Date }>(
    `select kind, value, note, occurred_at from pet_events
     where pet_id=$1 and occurred_at > now() - interval '72 hours' order by occurred_at desc limit 30`, [pet.id]);
  return {
    generatedAt: new Date().toISOString(),
    pet: { name: pet.name, species: pet.species, breed: pet.breed, age: ageText(pet.birth_date), sex: pet.sex,
      neutered: pet.neutered, weightKg: pet.weight_kg ? Number(pet.weight_kg) : null,
      conditions: pet.conditions, allergies: pet.allergies },
    triage: t ? { zone: t.zone, reasons: t.reasons, watchFor: t.watch_for, at: t.created_at.toISOString() } : null,
    recentEvents: ev.map((e) => ({ kind: e.kind, value: e.value, note: e.note, at: e.occurred_at.toISOString() })),
    disclaimer: 'ประเมินเบื้องต้นโดย AI ไม่ใช่การวินิจฉัยโดยสัตวแพทย์ เจ้าของยืนยันการแชร์ข้อมูลนี้แล้ว',
  };
}
