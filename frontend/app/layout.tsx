import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '2FA Auth',
  description: '2FA Auth',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
