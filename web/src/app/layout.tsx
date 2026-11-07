import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, Fraunces } from 'next/font/google';
import { I18nProvider } from '@/components/I18nProvider';
import './globals.css';

const body = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});
const display = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'RakSat',
  description: 'ผู้ช่วยดูแลสุนัขและแมว — ประเมินเบื้องต้น ไม่ใช่การวินิจฉัย',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
