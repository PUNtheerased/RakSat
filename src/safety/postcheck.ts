import { zoneRank, type Zone } from '../types.js';

export const SAFE_FALLBACK =
  'เรื่องยาและขนาดยา RakSat ไม่แนะนำเองนะคะ เพราะสัตว์แต่ละตัวต่างกันมากและผิดนิดเดียวก็อันตรายได้ ' +
  'ควรปรึกษาสัตวแพทย์โดยตรง ถ้าต้องการ RakSat ช่วยสรุปอาการส่งให้หมอก่อนได้ค่ะ';

const DRUGS = /(พาราเซตามอล|paracetamol|ไอบูโพรเฟน|ibuprofen|แอสไพริน|aspirin|ทรามาดอล|tramadol|ยาแก้ปวด(คน)?|ยาปฏิชีวนะ|amoxicillin|อะม็อกซี)/i;
const DOSE = /\d+(\.\d+)?\s*(มก\.?|มิลลิกรัม|mg|มล\.?|ml|เม็ด|ซีซี|cc)\s*(\/|ต่อ)?\s*(กก\.?|kg|ครั้ง|วัน)?/i;

export function postCheck(text: string): { ok: boolean; text: string; issues: string[] } {
  const issues: string[] = [];
  if (DRUGS.test(text)) issues.push('drug_name');
  if (DOSE.test(text) && /(ให้กิน|ป้อน|ฉีด|หยด|กินได้|ขนาด)/.test(text)) issues.push('dosage');
  return issues.length ? { ok: false, text: SAFE_FALLBACK, issues } : { ok: true, text, issues };
}

/** โซนสุดท้าย = สูงสุดของ (โซนจาก LLM, พื้นจากกฎ); ถ้า confidence ต่ำ ยกขึ้นหนึ่งระดับ */
export function finalZone(llmZone: Zone, confidence: 'low' | 'medium' | 'high', floor: Zone | null): Zone {
  const order: Zone[] = ['green', 'yellow', 'red'];
  let rank = zoneRank[llmZone];
  if (confidence === 'low') rank = Math.min(2, rank + 1);
  if (floor) rank = Math.max(rank, zoneRank[floor]);
  return order[rank]!;
}
