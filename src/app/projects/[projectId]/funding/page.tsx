'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { FundingData, FundingPhase } from '@/types';
import { generateId } from '@/lib/ids';
import { Wallet } from 'lucide-react';

const phaseColumns: Column<FundingPhase>[] = [
  { key: 'name', label: 'Phase', width: '22%' },
  { key: 'amount', label: 'Amount ($)', type: 'number', width: '16%' },
  { key: 'startDate', label: 'Start', type: 'date', width: '16%' },
  { key: 'endDate', label: 'End', type: 'date', width: '16%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'planned', label: 'Planned' },
      { value: 'approved', label: 'Approved' },
      { value: 'disbursed', label: 'Disbursed' },
      { value: 'completed', label: 'Completed' },
    ],
    width: '14%',
  },
];

export default function FundingPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const funding = project.funding;

  const update = (partial: Partial<FundingData>) => {
    updateModule(projectId, 'funding', { ...funding, ...partial });
  };

  const totalPhases = funding.phases.reduce((s, p) => s + p.amount, 0);
  const overAllocated = funding.totalBudget > 0 && totalPhases > funding.totalBudget;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Wallet size={24} />
        Funding & Feasibility
      </h1>

      <div className="space-y-6">
        {/* Budget summary */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Total Budget ($)</label>
          <input
            type="number"
            value={funding.totalBudget}
            onChange={(e) => update({ totalBudget: Number(e.target.value) })}
            className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          {funding.phases.length > 0 && (
            <div className={`mt-2 text-xs font-medium ${overAllocated ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
              {overAllocated && '⚠ Over-allocated: '}
              Allocated across phases: ${totalPhases.toLocaleString()} / ${funding.totalBudget.toLocaleString()}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feasibility Notes</h2>
          <textarea
            value={funding.feasibilityNotes}
            onChange={(e) => update({ feasibilityNotes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Feasibility assessment notes..."
          />
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Partner Details</h2>
          <textarea
            value={funding.partnerDetails}
            onChange={(e) => update({ partnerDetails: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Partner and co-funding details..."
          />
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Financial Projections</h2>
          <textarea
            value={funding.financialProjections}
            onChange={(e) => update({ financialProjections: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Revenue projections, ROI analysis..."
          />
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Funding Phases</h2>
          <EditableTable
            data={funding.phases}
            columns={phaseColumns}
            onUpdate={(phases) => update({ phases })}
            createRow={() => ({
              id: generateId(),
              name: '',
              amount: 0,
              startDate: '',
              endDate: '',
              status: 'planned' as const,
            })}
          />
        </div>
      </div>
    </div>
  );
}
