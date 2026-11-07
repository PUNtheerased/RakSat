import Link from 'next/link';
import { PawPrint } from 'lucide-react';

export function Logo({
  href = '/',
  light = false,
  showTag = true,
}: {
  href?: string;
  light?: boolean;
  showTag?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 min-h-11 ${light ? 'text-white' : 'text-[var(--forest)]'}`}
      aria-label="RakSat"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--leaf)] text-white">
        <PawPrint size={19} strokeWidth={2.2} aria-hidden />
      </span>
      <span>
        <span className="font-display block text-[22px] font-bold leading-none tracking-[-0.06em]">
          RakSat
        </span>
        {showTag ? (
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em] opacity-60">
            TYNAEX
          </span>
        ) : null}
      </span>
    </Link>
  );
}
