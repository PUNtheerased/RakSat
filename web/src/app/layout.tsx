import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, DM_Sans } from 'next/font/google';
import { I18nProvider } from '@/components/I18nProvider';
import './globals.css';

const body = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});
const display = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'RakSat — ผู้ช่วยดูแลน้องหมาน้องแมว',
  description: 'ประเมินอาการเบื้องต้น ดูแลน้องได้อย่างมั่นใจขึ้น — ไม่ใช่การวินิจฉัย',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f5ef',
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
