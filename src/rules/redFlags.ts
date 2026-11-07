import type { Species } from '../types.js';

/** ฉบับร่าง: ต้องให้สัตวแพทย์รีวิวก่อนเปิดให้ผู้ใช้จริง และอัปเดตเวอร์ชันทุกครั้งที่แก้ */
export const RULES_VERSION = '0.1.0-DRAFT-NOT-VET-REVIEWED';

export interface RedFlagRule { id: string; label: string; species?: Species[]; patterns: RegExp[] }
export interface RuleHit { id: string; label: string }

export const RED_FLAG_RULES: RedFlagRule[] = [
  { id: 'seizure', label: 'สงสัยอาการชัก', patterns: [/ชัก/, /ตัวเกร็ง/, /seizure/] },
  { id: 'breathing', label: 'หายใจลำบาก', patterns: [/หายใจ(ลำบาก|ไม่ออก|เหนื่อย)/, /หอบ(หนัก|มาก)/, /อ้าปากหายใจ/, /difficulty breathing/] },
  { id: 'gum_color', label: 'สีเหงือกผิดปกติ', patterns: [/เหงือก.{0,6}(ซีด|ขาว|เขียว|เทา|ม่วง|น้ำเงิน)/] },
  { id: 'collapse', label: 'หมดสติ/ล้มฟุบ/ขาอ่อนแรงเฉียบพลัน', patterns: [/หมดสติ/, /ล้มฟุบ/, /ลุกไม่ได้/, /เป็นอัมพาต/, /ขาหลัง.{0,6}(ใช้ไม่ได้|ลากขา)/] },
  { id: 'toxin', label: 'สงสัยกินสารอันตราย', patterns: [
    /(ช็อกโกแลต|ช็อคโกแลต|องุ่น|ลูกเกด|หัวหอม|ไซลิทอล|xylitol|พาราเซตามอล|ไอบูโพรเฟน)/,
    /ยา(ฆ่า|เบื่อ)(หนู|แมลง|มด)/, /น้ำยา(ล้างห้องน้ำ|ซักผ้า|ทำความสะอาด).{0,10}กิน/, /แอนติฟรีส|น้ำยาหม้อน้ำ/] },
  { id: 'lily', label: 'แมวสัมผัส/กินลิลลี่', species: ['cat'], patterns: [/ลิลลี่|ดอกลิลี่|lily/] },
  { id: 'urinary_block', label: 'สงสัยปัสสาวะไม่ออก', species: ['cat'], patterns: [/(ฉี่|ปัสสาวะ|เยี่ยว).{0,12}(ไม่ออก|ไม่ได้|เบ่ง|เป็นเลือด)/, /เบ่งฉี่/] },
  { id: 'bloat', label: 'สงสัยกระเพาะบิด/ท้องอืดรุนแรง', species: ['dog'], patterns: [/ท้อง.{0,6}(บวม|ใหญ่ขึ้น|แข็ง|ตึง)/, /พยายามอ้วก.{0,8}ไม่ออก/, /อาเจียนไม่ออก/] },
  { id: 'bleeding', label: 'เลือดออกมาก', patterns: [/เลือด.{0,4}(ออก|ไหล).{0,6}(ไม่หยุด|เยอะ|มาก)/, /เลือดพุ่ง/] },
  { id: 'trauma', label: 'อุบัติเหตุ/บาดเจ็บรุนแรง', patterns: [/(โดน|ถูก)รถ(ชน|ทับ)/, /รถชน/, /ตกจาก(ที่สูง|ตึก|ระเบียง|ชั้น)/, /โดนกัด.{0,6}(แผลลึก|เลือด)/] },
  { id: 'heatstroke', label: 'สงสัยฮีทสโตรก', patterns: [/ฮีท?สโตรก/, /ลมแดด/, /ตัวร้อนจัด/] },
];

export function normalize(t: string): string {
  return t.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

/**
 * ตั้งใจให้ "ไวเกินดีกว่าพลาด": ไม่ตัดผลลัพธ์เมื่อมีคำปฏิเสธ (เช่น "ไม่ชัก")
 * เพราะการตีความการปฏิเสธผิดอันตรายกว่าการเตือนเกิน
 */
export function checkRedFlags(text: string, species: Species): RuleHit[] {
  const t = normalize(text);
  return RED_FLAG_RULES
    .filter((r) => !r.species || r.species.includes(species))
    .filter((r) => r.patterns.some((p) => p.test(t)))
    .map((r) => ({ id: r.id, label: r.label }));
}
