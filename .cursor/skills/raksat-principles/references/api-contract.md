# RakSat API contract

Frontend ผูกกับสัญญา HTTP นี้ ไม่ผูกกับ LLM provider  
ทุก `/api/*` (ยกเว้นที่ระบุว่า public) ต้องมี `Authorization: Bearer <Supabase JWT>` (`sub` = owner id)  
เวลาเตือนเป็น Asia/Bangkok เก็บ timestamptz (UTC)

## Endpoints ที่มีแล้ว

| Method | Path | หมายเหตุ |
|---|---|---|
| GET | `/api/me` | consent + trial/access + adminRole |
| DELETE | `/api/me` | ลบข้อมูลทั้งหมด (PDPA) |
| POST | `/api/consent` | บันทึก consent ก่อน chat |
| POST | `/api/invite/redeem` | `{ code }` |
| POST | `/api/pets` | สร้างสัตว์ |
| GET | `/api/pets` | รายการสัตว์ |
| GET/POST | `/api/pets/:id/clinics` | คลินิกประจำ/ไปบ่อย |
| PATCH/DELETE | `/api/pets/:id/clinics/:clinicId` | ตั้งประจำ / ลบ |
| GET | `/api/pets/:id/messages` | ประวัติแชต |
| POST | `/api/chat` | → `AgentResult` |
| POST | `/api/actions/:id/confirm\|reject` | ยืนยัน/ปฏิเสธ proposal |
| POST | `/api/referrals` | `{ petId, clinicPlaceId? }` สร้างลิงก์สรุป |
| GET | `/api/clinics?lat&lng&mode=emergency\|general` | ค้นหาคลินิก |
| GET | `/api/pets/:id/timeline` | events + triage |
| GET/DELETE | `/api/reminders` | รายการ / ยกเลิก |
| POST | `/api/feedback` | 👍👎 |
| GET | `/api/surveys/pending` | คิวแบบฟอร์ม |
| POST | `/api/surveys/:trigger` | ส่งคำตอบ |
| POST | `/api/surveys/:trigger/snooze` | เลื่อน (สูงสุด 2) |
| POST | `/api/channels/webpush` | |
| GET | `/api/channels/webpush/key` | |
| POST | `/api/channels/line/link-code` | รหัส 6 หลัก |
| POST | `/line/webhook` | LINE (ไม่ใช่ frontend) |
| GET | `/public/referrals/:token` | สรุปหมอ (noindex) |
| POST | `/public/referrals/:token/feedback` | `{ helpful, note? }` |
| GET | `/api/admin/dashboard` | admin |
| GET/PATCH | `/api/admin/config` | Settings |
| GET/POST | `/api/admin/invites` | สร้าง key (code ครั้งเดียว) |
| POST | `/api/admin/invites/:id/revoke` | |
| GET | `/api/admin/users` | ไม่โชว์แชต |
| POST | `/api/admin/users/:id/suspend\|extend` | |
| GET | `/api/admin/review` | เหลือง/แดง (ซ่อนตัวตน) |
| PATCH | `/api/admin/review/:id` | ป้ายกฎถูก/เตือนเกิน/พลาด |
| GET | `/api/admin/review/export.csv` | export |
| GET | `/api/admin/feedback` | 👎 + surveys |
| GET | `/health` | |

## AgentResult

```ts
interface AgentResult {
  reply: string;
  zone: 'green' | 'yellow' | 'red' | null;
  emergency: boolean;
  sessionId: string | null;
  proposals: { id: string; kind: string; preview: string }[];
  clinics: { id: string; name: string; address: string; phone?: string; openNow?: boolean; distanceKm: number; reason?: string }[];
  reasons: string[];
  watchFor: string[];
}
```

## รหัส error

| HTTP | `error` | UI |
|---|---|---|
| 401 | `unauthorized` | login |
| 403 | `consent_required` | หน้า consent |
| 403 | `invite_required` / `trial_expired` / `suspended` / `llm_paused` | ตามสถานะ — **ฉุกเฉินยังใช้ได้** |
| 404 | `pet_not_found` / `not_found_or_expired` | |
| 429 | `daily_limit` | บอกว่าฉุกเฉินใช้ได้เสมอ |
| 400 | `invalid_input` | |
| 500 | `internal_error` | |

ห้ามเก็บ JWT ใน localStorage — ใช้ cookie httpOnly ผ่าน `@supabase/ssr`
