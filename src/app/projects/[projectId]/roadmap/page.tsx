'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { RoadmapItem } from '@/types';
import { generateId } from '@/lib/ids';
import { Map } from 'lucide-react';

const columns: Column<RoadmapItem>[] = [
  { key: 'feature', label: 'Feature', width: '18%' },
  { key: 'description', label: 'Description', width: '22%' },
  { key: 'quarter', label: 'Quarter', width: '10%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'planned', label: 'Planned' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'deferred', label: 'Deferred' },
    ],
    width: '12%',
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
    width: '10%',
  },
  { key: 'swimlane', label: 'Swimlane', width: '14%' },
];

export default function RoadmapPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Map size={24} />
        Product Roadmap
      </h1>

      <EditableTable
        data={project.roadmap}
        columns={columns}
        onUpdate={(data) => updateModule(projectId, 'roadmap', data)}
        createRow={() => ({
          id: generateId(),
          feature: '',
          description: '',
          quarter: '',
          status: 'planned' as const,
          priority: 'medium' as const,
          swimlane: '',
        })}
      />
    </div>
  );
}
