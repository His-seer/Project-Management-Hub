'use client';
import { useEffect } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { SkeletonDashboard } from '@/components/shared/Skeleton';

export function DbProvider({ children }: { children: React.ReactNode }) {
  const loadFromDb = useProjectStore((s) => s.loadFromDb);
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  if (!hydrated) {
    return <SkeletonDashboard />;
  }

  return <>{children}</>;
}
