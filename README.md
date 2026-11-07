# RakSat (Beta)

ผู้ช่วย AI ดูแลสุนัข/แมว — Fastify API + Next.js web + Supabase (Postgres + Auth)

Cloudflare ใช้เป็นด่านหน้า (Access / Turnstile / CDN) ไม่ใช่ฐานข้อมูล

## โครง

```
RakSat/
  src/                 # API (Fastify) + worker.ts
  db/schema.sql        # Postgres
  web/                 # Next.js
  AGENTS.md
  .cursor/skills/      # รวม raksat-principles
  scripts/e2e-curl.md
```

## เริ่ม API

1. สร้างโปรเจกต์ Supabase (Singapore) รัน `db/schema.sql`
2. คัดลอก `.env.example` → `.env` ใส่ `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `OPENROUTER_API_KEY` (โมเดลต้องลงท้าย `:free` เท่านั้น)
3. `npm install && npm run typecheck && npm test`
4. `npm run dev` (API :8787) และ `npm run worker` คนละ process
5. ใส่ตัวเองเป็นแอดมิน: `insert into admins(owner_id, role) values ('<supabase-user-uuid>', 'admin');`

## เริ่ม Web

```bash
cd web
cp .env.example .env.local   # SUPABASE + NEXT_PUBLIC_API_URL
npm run dev                  # :3000
```

## เกณฑ์ก่อนเชิญผู้ทดลอง

1. สัตวแพทย์รีวิวกฎโซนแดง/prompt แล้ว (ใช้ Admin → Review → Export)
2. เตือนถึงมือจริง (LINE OA)
3. คุมจำนวนด้วย invite / Settings.`require_invite`

## E2E

ดู [`scripts/e2e-curl.md`](scripts/e2e-curl.md) — ต้องมี credentials จริง

**สถานะ:** unit test + typecheck ผ่านแล้ว การรันกับ Supabase/LLM/LINE ของจริงขึ้นกับ `.env` ของคุณ
