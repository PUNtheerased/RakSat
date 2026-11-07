import { describe, expect, it } from 'vitest';
import { checkRedFlags } from './redFlags.js';
import { nextOccurrence } from '../time.js';
import { finalZone, postCheck } from '../safety/postcheck.js';

const ids = (t: string, s: 'dog' | 'cat') => checkRedFlags(t, s).map((h) => h.id);

describe('red flag rules', () => {
  it('จับอาการชัก', () => expect(ids('น้องชักตอนเช้า', 'dog')).toContain('seizure'));
  it('จับกินช็อกโกแลต', () => expect(ids('หมาแอบกินช็อกโกแลต', 'dog')).toContain('toxin'));
  it('แมวฉี่ไม่ออก = แดง แต่ไม่ใช่กฎของสุนัข', () => {
    expect(ids('ฉี่ไม่ออก เบ่งทั้งวัน', 'cat')).toContain('urinary_block');
    expect(ids('ฉี่ไม่ออก เบ่งทั้งวัน', 'dog')).not.toContain('urinary_block');
  });
  it('ท้องบวมแข็งเฉพาะสุนัข', () => {
    expect(ids('ท้องบวมแข็ง', 'dog')).toContain('bloat');
    expect(ids('ท้องบวมแข็ง', 'cat')).not.toContain('bloat');
  });
  it('เหงือกซีด', () => expect(ids('เหงือกซีดมาก', 'cat')).toContain('gum_color'));
  it('อาการทั่วไปไม่เข้าแดง', () => expect(ids('กินข้าวปกติ ร่าเริงดี ถ่ายปกติ', 'dog')).toEqual([]));
});

describe('nextOccurrence', () => {
  it('ยังไม่ถึงเวลา → วันนี้ (เวลาไทย)', () =>
    expect(nextOccurrence('17:00', new Date('2026-11-07T08:00:00Z')).toISOString()).toBe('2026-11-07T10:00:00.000Z'));
  it('เลยเวลาแล้ว → พรุ่งนี้', () =>
    expect(nextOccurrence('17:00', new Date('2026-11-07T11:00:00Z')).toISOString()).toBe('2026-11-08T10:00:00.000Z'));
  it('ตรงเวลาพอดี → พรุ่งนี้ (ไม่ส่งซ้ำ)', () =>
    expect(nextOccurrence('17:00', new Date('2026-11-07T10:00:00Z')).toISOString()).toBe('2026-11-08T10:00:00.000Z'));
  it('รูปแบบผิดต้อง error', () => expect(() => nextOccurrence('5pm', new Date())).toThrow());
});

describe('postCheck / finalZone', () => {
  it('บล็อกชื่อยา', () => expect(postCheck('ให้พาราเซตามอลได้นะ').ok).toBe(false));
  it('บล็อกขนาดยา', () => expect(postCheck('ให้กิน 10 มก./กก. วันละ 2 ครั้ง').ok).toBe(false));
  it('ผ่านคำแนะนำทั่วไป', () => expect(postCheck('ให้น้ำสะอาดและเฝ้าดูอาการต่ออีก 12 ชั่วโมงค่ะ').ok).toBe(true));
  it('confidence ต่ำยกโซน', () => expect(finalZone('green', 'low', null)).toBe('yellow'));
  it('พื้นจากกฎกดไม่ให้ต่ำกว่า', () => expect(finalZone('green', 'high', 'red')).toBe('red'));
});
