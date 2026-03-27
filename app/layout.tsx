import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Hermes Agents v2' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
