import { runDueReminders } from './reminders/scheduler.js';

async function tick() {
  try {
    const n = await runDueReminders();
    if (n) console.log(`[worker] processed ${n} reminders`);
  } catch (e) {
    console.error('[worker] error', e);
  }
}
console.log('[worker] started');
void tick();
setInterval(tick, 30_000);
