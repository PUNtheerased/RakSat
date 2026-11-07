import { z } from 'zod';
import { q } from '../db.js';
import { findClinics } from './places.js';
import { payloadSchemas, type ActionKind } from './actions.js';
import type { Location, PetRow, Proposal } from '../types.js';

export const ReportTriage = z.object({
  zone: z.enum(['green', 'yellow', 'red']),
  reasons: z.array(z.string()).max(5),
  watch_for: z.array(z.string()).max(6),
  follow_up_questions: z.array(z.string()).max(3).default([]),
  confidence: z.enum(['low', 'medium', 'high']),
});
export type TriageReport = z.infer<typeof ReportTriage>;

/** OpenAI / OpenRouter function-calling tools */
export const OPENAI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_pet_context',
      description: 'อ่านโปรไฟล์สัตว์และบันทึกล่าสุด 15 รายการ (อ่านอย่างเดียว)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'report_triage',
      description: 'ส่งผลประเมินเบื้องต้น เรียกทุกครั้งที่เจ้าของเล่าอาการผิดปกติ ก่อนตอบ',
      parameters: {
        type: 'object',
        required: ['zone', 'reasons', 'watch_for', 'confidence'],
        properties: {
          zone: { type: 'string', enum: ['green', 'yellow', 'red'] },
          reasons: { type: 'array', items: { type: 'string' } },
          watch_for: { type: 'array', items: { type: 'string' }, description: 'เงื่อนไขที่ต้องไปพบสัตวแพทย์' },
          follow_up_questions: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_event',
      description: 'เสนอบันทึกเหตุการณ์ (มื้ออาหาร ถ่าย อาเจียน น้ำหนัก ยา ฯลฯ) เจ้าของต้องกดยืนยัน',
      parameters: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['meal', 'water', 'stool', 'vomit', 'weight', 'medication', 'vaccine', 'symptom', 'note'] },
          value: { type: 'object', description: 'เช่น {"amount":"1 ถ้วย"} หรือ {"kg":4.2}' },
          note: { type: 'string' },
          occurredAt: { type: 'string', description: 'ISO 8601 ถ้าไม่ระบุใช้เวลาปัจจุบัน' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_reminder',
      description: 'เสนอตั้งเตือน (ให้อาหาร ยา วัคซีน) เวลาเป็นเวลาไทย เจ้าของต้องกดยืนยัน',
      parameters: {
        type: 'object',
        required: ['title', 'scheduleType'],
        properties: {
          title: { type: 'string' }, body: { type: 'string' },
          scheduleType: { type: 'string', enum: ['daily', 'once'] },
          timeOfDay: { type: 'string', description: 'HH:MM เวลาไทย สำหรับ daily' },
          at: { type: 'string', description: 'ISO 8601 UTC สำหรับ once' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'schedule_checkin',
      description: 'เสนอให้ระบบถามอาการซ้ำภายหลัง N ชั่วโมง เจ้าของต้องกดยืนยัน',
      parameters: {
        type: 'object',
        required: ['afterHours', 'question'],
        properties: { afterHours: { type: 'number' }, question: { type: 'string' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_clinic',
      description: 'หาคลินิกสัตว์ใกล้ตัว เรียงตามระยะทาง (ต้องมีตำแหน่งจากผู้ใช้)',
      parameters: { type: 'object', properties: { openNowOnly: { type: 'boolean' } } },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_referral',
      description: 'เสนอสร้างลิงก์สรุปอาการให้สัตวแพทย์ (ระบบสร้างเนื้อหาจากข้อมูลจริง) เจ้าของต้องกดยืนยัน',
      parameters: { type: 'object', properties: { clinicPlaceId: { type: 'string' } } },
    },
  },
];

export interface ToolCtx { ownerId: string; pet: PetRow; location?: Location; proposals: Proposal[]; triage?: TriageReport }
interface ToolResult { content: string; isError?: boolean }

async function propose(ctx: ToolCtx, kind: ActionKind, payload: unknown, preview: string): Promise<ToolResult> {
  const [row] = await q<{ id: string }>(
    `insert into pending_actions(owner_id,pet_id,kind,payload,preview) values($1,$2,$3,$4,$5) returning id`,
    [ctx.ownerId, ctx.pet.id, kind, JSON.stringify(payload), preview]);
  ctx.proposals.push({ id: row!.id, kind, preview });
  return { content: JSON.stringify({ status: 'proposed_waiting_for_owner_confirmation', preview }) };
}

export async function executeTool(name: string, input: unknown, ctx: ToolCtx): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get_pet_context': {
        const ev = await q(`select kind,value,note,occurred_at from pet_events where pet_id=$1 order by occurred_at desc limit 15`, [ctx.pet.id]);
        return { content: JSON.stringify({ pet: ctx.pet, recentEvents: ev }) };
      }
      case 'report_triage': {
        ctx.triage = ReportTriage.parse(input);
        return { content: 'recorded' };
      }
      case 'log_event': {
        const p = payloadSchemas.log_event.parse(input);
        return propose(ctx, 'log_event', p, `บันทึก ${p.kind}${p.note ? `: ${p.note}` : ''} ${Object.keys(p.value).length ? JSON.stringify(p.value) : ''}`.trim());
      }
      case 'create_reminder': {
        const p = payloadSchemas.create_reminder.parse(input);
        return propose(ctx, 'create_reminder', p, `ตั้งเตือน "${p.title}" ${p.scheduleType === 'daily' ? `ทุกวัน ${p.timeOfDay}` : `ครั้งเดียว ${p.at}`}`);
      }
      case 'schedule_checkin': {
        const p = payloadSchemas.schedule_checkin.parse(input);
        return propose(ctx, 'schedule_checkin', p, `ถามอาการซ้ำในอีก ${p.afterHours} ชั่วโมง: ${p.question}`);
      }
      case 'create_referral': {
        const p = payloadSchemas.create_referral.parse(input);
        return propose(ctx, 'create_referral', p, `สร้างลิงก์สรุปอาการ${ctx.pet.name}ให้สัตวแพทย์ (หมดอายุใน 48 ชั่วโมง)`);
      }
      case 'find_clinic': {
        if (!ctx.location) return { content: JSON.stringify({ error: 'ไม่มีตำแหน่งผู้ใช้ ให้ขอให้เจ้าของเปิดตำแหน่งหรือพิมพ์พื้นที่' }), isError: true };
        const openNowOnly = z.object({ openNowOnly: z.boolean().optional() }).parse(input ?? {}).openNowOnly;
        const clinics = await findClinics(ctx.location, openNowOnly);
        return { content: JSON.stringify(clinics.length ? clinics : { error: 'ไม่พบคลินิก หรือยังไม่ได้ตั้งค่า Places API' }) };
      }
      default:
        return { content: `unknown tool ${name}`, isError: true };
    }
  } catch (e) {
    return { content: `tool error: ${e instanceof Error ? e.message : String(e)}`, isError: true };
  }
}
