'use client';
import { useEffect } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';

export function DbProvider({ children }: { children: React.ReactNode }) {
  const loadFromDb = useProjectStore((s) => s.loadFromDb);
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading projects…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
