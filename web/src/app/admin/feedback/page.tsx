'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

export default function AdminFeedback() {
  const { token } = useSession();
  const [data, setData] = useState<{ downs: unknown[]; surveys: unknown[] } | null>(null);

  useEffect(() => {
    if (!token) return;
    api<{ downs: unknown[]; surveys: unknown[] }>('/api/admin/feedback', { token }).then(setData);
  }, [token]);

  if (!data) return <p>กำลังโหลด…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">Feedback</h1>
      <h2 className="font-semibold mb-2">👎 พร้อมบริบท</h2>
      <pre className="card text-xs overflow-auto mb-6">{JSON.stringify(data.downs, null, 2)}</pre>
      <h2 className="font-semibold mb-2">แบบฟอร์ม</h2>
      <pre className="card text-xs overflow-auto">{JSON.stringify(data.surveys, null, 2)}</pre>
    </div>
  );
}
