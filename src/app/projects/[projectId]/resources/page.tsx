'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Resource } from '@/types';
import { generateId } from '@/lib/ids';
import { Users, AlertTriangle } from 'lucide-react';

const columns: Column<Resource>[] = [
  { key: 'name', label: 'Name', width: '16%' },
  { key: 'role', label: 'Role', width: '14%' },
  { key: 'email', label: 'Email', width: '18%' },
  { key: 'allocationPercent', label: 'Allocation %', type: 'number', width: '11%' },
  { key: 'costRate', label: 'Cost Rate ($/hr)', type: 'number', width: '12%' },
  {
    key: 'availability',
    label: 'Availability',
    type: 'select',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'partial', label: 'Partial' },
      { value: 'unavailable', label: 'Unavailable' },
    ],
    width: '12%',
  },
];

export default function ResourcesPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const resources = project.resources;

  const totalCost = resources.reduce((sum, r) => sum + (r.costRate * r.allocationPercent) / 100, 0);
  const overAllocated = resources.filter((r) => r.allocationPercent > 100);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Users size={24} />
        Resource Planning
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{resources.length}</div>
          <div className="text-xs text-gray-500">Total Resources</div>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {resources.filter((r) => r.availability === 'available').length}
          </div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">Weighted Cost/hr</div>
        </div>
      </div>

      {overAllocated.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{overAllocated.length} over-allocated resource{overAllocated.length > 1 ? 's' : ''}:</span>{' '}
            {overAllocated.map((r) => `${r.name || 'Unnamed'} (${r.allocationPercent}%)`).join(', ')}.
            Allocation exceeding 100% indicates burnout risk.
          </span>
        </div>
      )}

      <EditableTable
        data={resources}
        columns={columns}
        onUpdate={(data) => updateModule(projectId, 'resources', data)}
        createRow={() => ({
          id: generateId(),
          name: '',
          role: '',
          email: '',
          allocationPercent: 100,
          costRate: 0,
          assignedTaskIds: [],
          availability: 'available' as const,
        })}
      />
    </div>
  );
}
