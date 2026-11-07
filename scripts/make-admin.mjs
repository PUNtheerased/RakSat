import 'dotenv/config';
import pg from 'pg';

const id = process.argv[2];
if (!id) {
  console.error('usage: node scripts/make-admin.mjs <uuid>');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query('insert into owners(id) values($1) on conflict do nothing', [id]);
await pool.query(
  `insert into admins(owner_id, role) values($1, 'admin')
   on conflict (owner_id) do update set role = 'admin'`,
  [id],
);
const r = await pool.query('select owner_id, role from admins where owner_id=$1', [id]);
console.log(r.rows);
await pool.end();
