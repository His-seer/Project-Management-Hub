'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { DbProvider } from '@/components/providers/DbProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Sidebar />
      <ClientLayout>
        <DbProvider>{children}</DbProvider>
      </ClientLayout>
    </ThemeProvider>
  );
}
