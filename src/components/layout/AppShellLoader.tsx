'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('@/components/layout/AppShell'), { ssr: false });

export default function AppShellLoader({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
