import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { DbProvider } from '@/components/providers/DbProvider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PM Hub — Project Management',
  description: 'Unified Project Management Application',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <Sidebar />
          <ClientLayout>
            <DbProvider>{children}</DbProvider>
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
