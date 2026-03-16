'use client';

import { useParams } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Project } from '@/types';

export function useCurrentProject(): Project | undefined {
  const params = useParams();
  const projectId = params?.projectId as string;
  return useProjectStore((s) => s.projects[projectId]);
}

export function useProjectId(): string {
  const params = useParams();
  return params?.projectId as string;
}
