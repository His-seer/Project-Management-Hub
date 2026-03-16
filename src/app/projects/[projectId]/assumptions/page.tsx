'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Assumption } from '@/types';
import { generateId } from '@/lib/ids';
import { FlaskConical, ShieldAlert } from 'lucide-react';

const validationColors: Record<string, string> = {
  unvalidated: 'badge-gray',
  validated: 'badge-green',
  invalidated: 'badge-red',
  'in-progress': 'badge-amber',
};

const riskColors: Record<string, string> = {
  low: 'badge-green',
  medium: 'badge-amber',
  high: 'badge-red',
  critical: 'badge-red',
};

const columns: Column<Assumption>[] = [
  { key: 'assumption', label: 'Assumption', width: '22%' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    width: '10%',
    options: [
      { value: 'technical', label: 'Technical' },
      { value: 'business', label: 'Business' },
      { value: 'resource', label: 'Resource' },
      { value: 'external', label: 'External' },
      { value: 'regulatory', label: 'Regulatory' },
    ],
    render: (val) => <span className="badge-blue">{String(val)}</span>,
  },
  { key: 'owner', label: 'Owner', width: '10%' },
  { key: 'targetValidationDate', label: 'Validate By', type: 'date', width: '10%' },
  {
    key: 'validationStatus',
    label: 'Status',
    type: 'select',
    width: '12%',
    options: [
      { value: 'unvalidated', label: 'Unvalidated' },
      { value: 'validated', label: 'Validated' },
      { value: 'invalidated', label: 'Invalidated' },
      { value: 'in-progress', label: 'In Progress' },
    ],
    render: (val) => <span className={validationColors[String(val)] ?? 'badge-gray'}>{String(val)}</span>,
  },
  {
    key: 'riskLevel',
    label: 'Risk',
    type: 'select',
    width: '8%',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' },
    ],
    render: (val) => <span className={riskColors[String(val)] ?? 'badge-gray'}>{String(val)}</span>,
  },
  { key: 'impactIfInvalid', label: 'Impact if Invalid', width: '18%' },
  { key: 'notes', label: 'Notes', width: '10%' },
];

export default function AssumptionsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const assumptions = project.assumptions ?? [];

  const handleUpdate = (updated: Assumption[]) => {
    updateModule(projectId, 'assumptions', updated);
  };

  const createRow = (): Assumption => ({
    id: generateId(),
    assumption: '',
    category: 'business',
    owner: '',
    validationMethod: '',
    targetValidationDate: '',
    validationStatus: 'unvalidated',
    impactIfInvalid: '',
    riskLevel: 'medium',
    notes: '',
  });

  const invalidated = assumptions.filter((a) => a.validationStatus === 'invalidated');
  const validated = assumptions.filter((a) => a.validationStatus === 'validated');
  const unvalidated = assumptions.filter((a) => a.validationStatus === 'unvalidated');
  const critical = assumptions.filter((a) => a.riskLevel === 'critical');
  const today = new Date(); today.setHours(0,0,0,0);
  const overdueValidation = assumptions.filter(
    (a) => a.targetValidationDate &&
    new Date(a.targetValidationDate) < today &&
    a.validationStatus !== 'validated' &&
    a.validationStatus !== 'invalidated'
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <FlaskConical size={20} className="text-indigo-500" />
            Assumptions Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and validate project assumptions — invalidated assumptions become risks
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', count: assumptions.length, cls: 'text-slate-700 dark:text-white' },
          { label: 'Validated', count: validated.length, cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Invalidated', count: invalidated.length, cls: 'text-red-600 dark:text-red-400' },
          { label: 'Critical Risk', count: critical.length, cls: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="pm-card p-4">
            <div className={`text-2xl font-bold ${s.cls}`}>{s.count}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overdue validation warnings */}
      {overdueValidation.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{overdueValidation.length} assumption{overdueValidation.length > 1 ? 's' : ''} overdue for validation:</span>{' '}
            {overdueValidation.map((a) => a.assumption.slice(0, 40) || 'Untitled').join('; ')}.
            Update their status or raise as risks.
          </span>
        </div>
      )}

      {/* Invalidated warnings */}
      {invalidated.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm mb-2">
            <ShieldAlert size={16} />
            {invalidated.length} Invalidated Assumption{invalidated.length !== 1 ? 's' : ''} — Review and raise risks
          </div>
          <ul className="space-y-1">
            {invalidated.map((a) => (
              <li key={a.id} className="text-xs text-red-600 dark:text-red-400">
                • {a.assumption} — {a.impactIfInvalid}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pm-card p-5">
        <EditableTable
          data={assumptions}
          columns={columns}
          onUpdate={handleUpdate}
          createRow={createRow}
          emptyMessage="No assumptions logged yet. Click 'Add Row' to add your first assumption."
        />
      </div>
    </div>
  );
}
