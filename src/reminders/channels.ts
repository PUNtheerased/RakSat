import { createRequire } from 'node:module';
import { config } from '../config.js';
import { q } from '../db.js';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof import('web-push');

export interface DeliveryResult { channel: 'line' | 'webpush'; ok: boolean; error?: string }

if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
}

export async function pushLine(lineUserId: string, text: string): Promise<DeliveryResult> {
  if (!config.LINE_CHANNEL_ACCESS_TOKEN) return { channel: 'line', ok: false, error: 'LINE not configured' };
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
  });
  return res.ok ? { channel: 'line', ok: true } : { channel: 'line', ok: false, error: `LINE ${res.status}` };
}

export async function pushWeb(ownerId: string, title: string, body: string): Promise<DeliveryResult[]> {
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) return [];
  const subs = await q<{ endpoint: string; keys: { p256dh: string; auth: string } }>(
    `select endpoint, keys from push_subscriptions where owner_id=$1`, [ownerId]);
  const out: DeliveryResult[] = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body }));
      out.push({ channel: 'webpush', ok: true });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await q(`delete from push_subscriptions where endpoint=$1`, [s.endpoint]); // subscription ตายแล้ว
      out.push({ channel: 'webpush', ok: false, error: `webpush ${code ?? 'error'}` });
    }
  }
  return out;
}

export async function deliver(ownerId: string, lineUserId: string | null, title: string, body: string | null): Promise<DeliveryResult[]> {
  const text = body ? `${title}\n${body}` : title;
  const results: DeliveryResult[] = [];
  if (lineUserId) results.push(await pushLine(lineUserId, `🐾 ${text}`));
  results.push(...(await pushWeb(ownerId, title, body ?? '')));
  if (!results.length) results.push({ channel: 'line', ok: false, error: 'no channel linked' });
  return results;
}
