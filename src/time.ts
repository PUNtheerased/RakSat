const BKK_OFFSET_MS = 7 * 3600_000; // Asia/Bangkok = UTC+7 ไม่มี DST

/** เวลาถัดไปที่ตรงกับ HH:MM (เวลาไทย) หลังจาก now */
export function nextOccurrence(timeOfDay: string, now: Date): Date {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay);
  if (!m) throw new Error(`invalid timeOfDay: ${timeOfDay}`);
  const bkkNow = new Date(now.getTime() + BKK_OFFSET_MS);
  const cand = new Date(bkkNow);
  cand.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
  if (cand.getTime() <= bkkNow.getTime()) cand.setUTCDate(cand.getUTCDate() + 1);
  return new Date(cand.getTime() - BKK_OFFSET_MS);
}
