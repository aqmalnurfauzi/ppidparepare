import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '@/components/ThemeProvider';
import { ChatWidget } from '@/components/ChatWidget'; // BARU

export const metadata: Metadata = {
  title: 'PPID Kementerian Agama Kota Parepare',
  description: 'Portal Layanan Informasi Publik Kementerian Agama Kota Parepare. Akses dokumen, laporan, dan informasi publik secara transparan.',
  icons: {
    icon: '/logo-kemenag.png',
    shortcut: '/logo-kemenag.png',
    apple: '/logo-kemenag.png',
  },
  openGraph: {
    title: 'PPID Kemenag Parepare',
    description: 'Akses Informasi Publik Kementerian Agama Kota Parepare secara transparan.',
    images: ['/logo-kemenag.png'],
    type: 'website',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}