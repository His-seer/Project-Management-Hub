'use client';

import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const project = useCurrentProject();
  const router = useRouter();
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !project) {
      router.push('/');
    }
  }, [hydrated, project, router]);

  // While store is hydrating, show a neutral loading state (no redirect yet)
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Project not found. Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
