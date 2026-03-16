'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { EstimateItem } from '@/types';
import { generateId } from '@/lib/ids';
import { DollarSign } from 'lucide-react';

const columns: Column<EstimateItem>[] = [
  { key: 'phase', label: 'Phase', width: '16%' },
  { key: 'item', label: 'Item', width: '20%' },
  { key: 'hours', label: 'Hours', type: 'number', width: '12%' },
  { key: 'rate', label: 'Rate ($/hr)', type: 'number', width: '12%' },
  { key: 'materialCost', label: 'Material ($)', type: 'number', width: '14%' },
  {
    key: 'total',
    label: 'Total ($)',
    width: '14%',
    editable: false,
    render: (_, row) => {
      const total = row.hours * row.rate + row.materialCost;
      return <span className="font-medium text-gray-900 dark:text-white">${total.toLocaleString()}</span>;
    },
  },
];

export default function EstimatesPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const estimates = project.estimates;

  const handleUpdate = (items: EstimateItem[]) => {
    const updated = items.map((e) => ({
      ...e,
      total: e.hours * e.rate + e.materialCost,
    }));
    updateModule(projectId, 'estimates', updated);
  };

  const grandTotal = estimates.reduce((sum, e) => sum + e.hours * e.rate + e.materialCost, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <DollarSign size={24} />
        Project Estimates
      </h1>

      <div className="mb-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="text-sm text-gray-500">Grand Total</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <EditableTable
        data={estimates}
        columns={columns}
        onUpdate={handleUpdate}
        createRow={() => ({
          id: generateId(),
          phase: '',
          item: '',
          hours: 0,
          rate: 0,
          materialCost: 0,
          total: 0,
        })}
      />
    </div>
  );
}
