'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/invites', label: 'Invites' },
  { href: '/admin/review', label: 'Review' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/feedback', label: 'Feedback' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Logo href="/admin" showTag={false} />
        <nav className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`btn ${path === l.href ? 'btn-primary' : 'btn-ghost'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <p className="text-xs text-[var(--muted)] mb-4">
        ครอบด้วย Cloudflare Access ใน production เป็นด่านสอง — สิทธิ์จริงตรวจจากตาราง admins ฝั่ง API
      </p>
      <div className="animate-enter">{children}</div>
      <p className="mt-8">
        <Link href="/app" className="text-sm font-semibold text-[var(--leaf)]">กลับหน้าผู้ใช้</Link>
      </p>
    </div>
  );
}
