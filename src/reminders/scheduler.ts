import { pool } from '../db.js';
import { nextOccurrence } from '../time.js';
import { deliver } from './channels.js';

interface DueRow { id: string; owner_id: string; title: string; body: string | null; schedule_type: 'daily' | 'once';
  time_of_day: string | null; line_user_id: string | null }

/**
 * เรียกทุก ~30 วินาทีจาก worker. ใช้ FOR UPDATE SKIP LOCKED จึงรันหลาย instance พร้อมกันได้โดยไม่ส่งซ้ำ
 * ข้อจำกัด: เรียกเครือข่ายขณะถือ lock (พอสำหรับ beta) ถ้าโตขึ้นให้แยกเป็น queue
 */
export async function runDueReminders(now = new Date()): Promise<number> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const { rows } = await c.query<DueRow>(
      `select r.id, r.owner_id, r.title, r.body, r.schedule_type, r.time_of_day, o.line_user_id
         from reminders r join owners o on o.id = r.owner_id
        where r.active and r.next_run_at <= $1
        order by r.next_run_at limit 50 for update of r skip locked`, [now.toISOString()]);
    for (const r of rows) {
      const results = await deliver(r.owner_id, r.line_user_id, r.title, r.body);
      for (const d of results) {
        await c.query(`insert into reminder_deliveries(reminder_id,channel,status,error) values($1,$2,$3,$4)`,
          [r.id, d.channel, d.ok ? 'sent' : 'failed', d.error ?? null]);
      }
      if (r.schedule_type === 'daily' && r.time_of_day) {
        await c.query(`update reminders set next_run_at=$2 where id=$1`, [r.id, nextOccurrence(r.time_of_day, now).toISOString()]);
      } else {
        await c.query(`update reminders set active=false where id=$1`, [r.id]);
      }
    }
    await c.query('commit');
    return rows.length;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}
