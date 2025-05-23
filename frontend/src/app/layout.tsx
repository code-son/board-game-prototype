import type { Metadata } from 'next';

import './globals.css';
import Layout from '@/components/Layout';
import { UserProvider } from '@/contexts/UserContext';

export const metadata: Metadata = {
  title: {
    template: '%s | KIBAKO',
    default: 'KIBAKO',
  },
  description: '気軽にボードゲームを作ろう',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <UserProvider>
          <Layout>{children}</Layout>
        </UserProvider>
      </body>
    </html>
  );
}
