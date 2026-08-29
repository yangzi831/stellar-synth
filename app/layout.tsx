import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '星图演奏 — A Playable Atlas of Sky Cultures',
  description: 'One sky, many worlds: an interactive atlas and musical instrument for sky cultures.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
