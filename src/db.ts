import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query<T>(text, params);
  return r.rows;
}
