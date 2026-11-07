import 'dotenv/config';
import { z } from 'zod';

const FREE_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

const Env = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  /** Project URL เช่น https://xxxx.supabase.co — ใช้ดึง JWKS ตรวจ JWT แบบใหม่ */
  SUPABASE_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().min(1),
  /** บังคับโมเดลฟรีเท่านั้น — ต้องลงท้ายด้วย :free */
  OPENROUTER_MODEL: z.string().default(FREE_MODEL).refine(
    (m) => m.endsWith(':free'),
    { message: 'OPENROUTER_MODEL ต้องเป็นโมเดลฟรีเท่านั้น (ลงท้ายด้วย :free)' },
  ),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@example.com'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(8787),
});

export const config = Env.parse(process.env);
export const DEFAULT_FREE_MODEL = FREE_MODEL;
