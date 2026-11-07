import { config } from '../config.js';
import { q } from '../db.js';
import { checkRedFlags, RULES_VERSION } from '../rules/redFlags.js';
import { finalZone, postCheck } from '../safety/postcheck.js';
import { dailyLimitFor, ensureOpenSignupActivated, llmAccessBlock, loadOwner } from '../access.js';
import { systemPrompt } from './prompt.js';
import { executeTool, type ToolCtx } from './tools.js';
import { findClinics } from './places.js';
import { openRouterChat, type OrMessage } from './openrouter.js';
import type { Clinic, Location, PetRow, Proposal, Zone } from '../types.js';

const MAX_STEPS = 6;

export class NotFoundError extends Error {}
export class LimitError extends Error {}
export class AccessError extends Error {
  constructor(public code: 'invite_required' | 'trial_expired' | 'suspended' | 'llm_paused') {
    super(code);
  }
}

export interface AgentInput { ownerId: string; petId: string; message: string; location?: Location }
export interface AgentResult {
  reply: string; zone: Zone | null; emergency: boolean; sessionId: string | null;
  proposals: Proposal[]; clinics: Clinic[]; reasons: string[]; watchFor: string[];
}

export const EMERGENCY_REPLY = (name: string, labels: string[]) =>
  `${name}มีสัญญาณที่อาจอันตราย (${labels.join(', ')}) ควรพาไปคลินิกสัตว์ทันทีค่ะ ไม่ควรรอเฝ้าดูที่บ้าน ` +
  `ระหว่างเดินทางโทรแจ้งคลินิกล่วงหน้าได้ และ RakSat ส่งสรุปอาการให้หมอก่อนถึงได้ถ้าคุณกดยืนยัน`;

async function saveTurn(ownerId: string, petId: string, user: string, assistant: string) {
  await q(`insert into messages(pet_id,owner_id,role,content) values($1,$2,'user',$3),($1,$2,'assistant',$4)`, [petId, ownerId, user, assistant]);
}

async function logUsage(ownerId: string, usage?: { input_tokens: number; output_tokens: number }) {
  if (!usage) return;
  await q(`insert into llm_usage(owner_id,input_tokens,output_tokens) values($1,$2,$3)`,
    [ownerId, usage.input_tokens, usage.output_tokens]);
}

export async function runAgent(inp: AgentInput): Promise<AgentResult> {
  const [pet] = await q<PetRow>(`select * from pets where id=$1 and owner_id=$2`, [inp.petId, inp.ownerId]);
  if (!pet) throw new NotFoundError('pet not found');

  // 1) กฎโซนแดงรันก่อนเสมอ — ไม่ผ่าน LLM ไม่ติดโควตา/key
  const hits = checkRedFlags(inp.message, pet.species);
  if (hits.length) {
    const labels = hits.map((h) => h.label);
    const [s] = await q<{ id: string }>(
      `insert into triage_sessions(pet_id,owner_id,input_text,zone,rule_ids,reasons,watch_for,rules_version)
       values($1,$2,$3,'red',$4,$5,'[]',$6) returning id`,
      [pet.id, inp.ownerId, inp.message, hits.map((h) => h.id), JSON.stringify(labels), RULES_VERSION]);
    let clinics: Clinic[] = [];
    if (inp.location) { try { clinics = await findClinics(inp.location, true); } catch { /* */ } }
    const reply = EMERGENCY_REPLY(pet.name, labels);
    await saveTurn(inp.ownerId, pet.id, inp.message, reply);
    return { reply, zone: 'red', emergency: true, sessionId: s!.id, proposals: [], clinics, reasons: labels, watchFor: [] };
  }

  // 2) สิทธิ์เส้นทาง LLM
  await ensureOpenSignupActivated(inp.ownerId);
  const owner = await loadOwner(inp.ownerId);
  if (!owner) throw new NotFoundError('owner');
  const block = await llmAccessBlock(owner);
  if (block) throw new AccessError(block);

  const limit = await dailyLimitFor(owner);
  if (limit != null) {
    const [used] = await q<{ n: string }>(
      `select count(*) n from messages where owner_id=$1 and role='user' and created_at > now() - interval '24 hours'`, [inp.ownerId]);
    if (Number(used!.n) >= limit) throw new LimitError('daily limit reached');
  }

  // 3) OpenRouter agent loop (free model เท่านั้น)
  const hist = await q<{ role: 'user' | 'assistant'; content: string }>(
    `select role, content from (select role, content, created_at from messages where pet_id=$1 and owner_id=$2 order by created_at desc limit 12) t order by created_at asc`,
    [pet.id, inp.ownerId]);
  while (hist.length && hist[0]!.role !== 'user') hist.shift();

  const nowBkk = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'short' });
  const messages: OrMessage[] = [
    { role: 'system', content: systemPrompt(pet, nowBkk) },
    ...hist.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: inp.message },
  ];

  const ctx: ToolCtx = { ownerId: inp.ownerId, pet, location: inp.location, proposals: [] };
  let text = '';

  for (let step = 0; step < MAX_STEPS; step++) {
    const { message, usage } = await openRouterChat(messages, { enableReasoning: true });
    await logUsage(inp.ownerId, usage);

    const assistantMsg: OrMessage = {
      role: 'assistant',
      content: message.content,
      tool_calls: message.tool_calls,
      reasoning_details: message.reasoning_details,
    };
    messages.push(assistantMsg);

    if (message.content) text = message.content.trim();

    const calls = message.tool_calls ?? [];
    if (!calls.length) break;

    for (const call of calls) {
      let args: unknown = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
      const r = await executeTool(call.function.name, args, ctx);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: r.content,
      });
    }
  }

  // 4) บังคับโซน + post-check
  let zone: Zone | null = null, sessionId: string | null = null;
  if (ctx.triage) {
    zone = finalZone(ctx.triage.zone, ctx.triage.confidence, null);
    const [s] = await q<{ id: string }>(
      `insert into triage_sessions(pet_id,owner_id,input_text,zone,llm_zone,confidence,reasons,watch_for,rules_version,model)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [pet.id, inp.ownerId, inp.message, zone, ctx.triage.zone, ctx.triage.confidence, JSON.stringify(ctx.triage.reasons),
        JSON.stringify(ctx.triage.watch_for), RULES_VERSION, config.OPENROUTER_MODEL]);
    sessionId = s!.id;
  }
  const checked = postCheck(text || (ctx.proposals.length ? 'ได้เลยค่ะ ตรวจสอบรายการด้านล่างแล้วกดยืนยันได้เลย' : 'ขอโทษค่ะ ลองพิมพ์ใหม่อีกครั้งได้ไหมคะ'));
  await saveTurn(inp.ownerId, pet.id, inp.message, checked.text);
  return {
    reply: checked.text, zone, emergency: zone === 'red', sessionId, proposals: ctx.proposals, clinics: [],
    reasons: ctx.triage?.reasons ?? [], watchFor: ctx.triage?.watch_for ?? [],
  };
}
