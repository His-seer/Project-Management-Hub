'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { DbProvider } from '@/components/providers/DbProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Sidebar />
      <ClientLayout>
        <DbProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </DbProvider>
      </ClientLayout>
    </ThemeProvider>
  );
}
