import type { Metadata } from 'next';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LOCARRY - 지역별 상가 정보',
    template: '%s | LOCARRY',
  },
  description: '공공데이터 기반 지역별 상가 정보를 제공합니다. 전국 상가 정보를 한눈에 확인하세요.',
  keywords: ['상가', '상권', '지역정보', '공공데이터', 'LOCARRY'],
  authors: [{ name: 'LOCARRY' }],
  creator: 'LOCARRY',
  publisher: 'LOCARRY',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: 'LOCARRY',
    title: 'LOCARRY - 지역별 상가 정보',
    description: '공공데이터 기반 지역별 상가 정보를 제공합니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LOCARRY - 지역별 상가 정보',
    description: '공공데이터 기반 지역별 상가 정보를 제공합니다.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

