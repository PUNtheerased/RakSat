export type Zone = 'green' | 'yellow' | 'red' | null;

export interface AgentResult {
  reply: string;
  zone: Zone;
  emergency: boolean;
  sessionId: string | null;
  proposals: { id: string; kind: string; preview: string }[];
  clinics: {
    id: string; name: string; address: string; phone?: string;
    openNow?: boolean; distanceKm: number; reason?: string;
  }[];
  reasons: string[];
  watchFor: string[];
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body?: unknown) {
    super(code);
  }
}

const base = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function api<T>(
  path: string,
  opts: { token?: string | null; method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${base()}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const code = (data as { error?: string })?.error ?? 'internal_error';
    throw new ApiError(res.status, code, data);
  }
  return data as T;
}
