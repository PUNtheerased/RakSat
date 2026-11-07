import { q } from './db.js';

export type AdminRole = 'admin' | 'reviewer';

export async function requireAdmin(ownerId: string, min: AdminRole = 'reviewer'): Promise<AdminRole | null> {
  const [a] = await q<{ role: AdminRole }>(`select role from admins where owner_id=$1`, [ownerId]);
  if (!a) return null;
  if (min === 'admin' && a.role !== 'admin') return null;
  return a.role;
}

export async function audit(adminId: string, action: string, target?: string, meta: Record<string, unknown> = {}) {
  await q(`insert into admin_audit_log(admin_id, action, target, meta) values($1,$2,$3,$4)`,
    [adminId, action, target ?? null, JSON.stringify(meta)]);
}
