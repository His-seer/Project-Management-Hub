'use client';

import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SkeletonProjectPage } from '@/components/shared/Skeleton';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const project = useCurrentProject();
  const router = useRouter();
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !project) {
      router.push('/');
    }
  }, [hydrated, project, router]);

  if (!hydrated) {
    return <SkeletonProjectPage />;
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
