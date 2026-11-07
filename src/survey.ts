import { q } from './db.js';
import { loadOwner } from './access.js';

const TRIGGERS = ['day3', 'after_10_chats', 'post_red_24h', 'day7', 'trial_end'] as const;
export type SurveyTrigger = (typeof TRIGGERS)[number];

export async function pendingSurveys(ownerId: string): Promise<{ trigger: SurveyTrigger; snoozedCount: number }[]> {
  const owner = await loadOwner(ownerId);
  if (!owner?.activated_at) return [];
  const activated = new Date(owner.activated_at).getTime();
  const days = (Date.now() - activated) / 86400_000;
  const out: { trigger: SurveyTrigger; snoozedCount: number }[] = [];

  const done = await q<{ trigger: string }>(
    `select trigger from survey_responses where owner_id=$1 and answers <> '{}'::jsonb`, [ownerId]);
  const doneSet = new Set(done.map((d) => d.trigger));
  const snoozes = await q<{ trigger: string; snoozed_count: number; snoozed_until: Date | null }>(
    `select trigger, snoozed_count, snoozed_until from survey_snoozes where owner_id=$1`, [ownerId]);
  const snoozeMap = new Map(snoozes.map((s) => [s.trigger, s]));

  const [chats] = await q<{ n: string }>(
    `select count(*) n from messages where owner_id=$1 and role='user'`, [ownerId]);
  const [red] = await q<{ created_at: Date }>(
    `select created_at from triage_sessions where owner_id=$1 and zone='red' order by created_at desc limit 1`, [ownerId]);

  const candidates: { trigger: SurveyTrigger; due: boolean }[] = [
    { trigger: 'day3', due: days >= 3 },
    { trigger: 'after_10_chats', due: Number(chats?.n ?? 0) >= 10 },
    { trigger: 'post_red_24h', due: !!red && Date.now() - new Date(red.created_at).getTime() >= 86400_000 },
    { trigger: 'day7', due: days >= 7 },
    { trigger: 'trial_end', due: !!owner.access_until && new Date(owner.access_until) <= new Date() },
  ];

  for (const c of candidates) {
    if (!c.due || doneSet.has(c.trigger)) continue;
    const s = snoozeMap.get(c.trigger);
    if (s?.snoozed_until && new Date(s.snoozed_until) > new Date()) continue;
    out.push({ trigger: c.trigger, snoozedCount: s?.snoozed_count ?? 0 });
  }
  return out;
}
