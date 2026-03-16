'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Issue } from '@/types';
import { generateId } from '@/lib/ids';
import { AlertCircle } from 'lucide-react';

// columns is a function so it can access risks for linked risk display
function buildColumns(risks: { id: string; title: string; severity: number }[]): Column<Issue>[] {
  return [
  { key: 'title', label: 'Issue', width: '16%' },
  { key: 'description', label: 'Description', width: '18%' },
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
    width: '9%',
  },
  { key: 'owner', label: 'Owner', width: '10%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'closed', label: 'Closed' },
    ],
    width: '9%',
  },
  { key: 'resolution', label: 'Resolution', width: '13%' },
  {
    key: 'dueDate',
    label: 'Due Date',
    type: 'date',
    width: '9%',
    render: (value, row) => {
      const date = value as string;
      const isOverdue =
        date &&
        new Date(date) < new Date() &&
        row.status !== 'resolved' &&
        row.status !== 'closed';
      return (
        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
          {date || '—'}
          {isOverdue && <span className="ml-1 text-[10px] badge-red">Overdue</span>}
        </span>
      );
    },
  },
  {
    key: 'linkedRiskId',
    label: 'Linked Risk',
    width: '16%',
    render: (value) => {
      const riskId = value as string | undefined;
      if (!riskId) return <span className="text-gray-400 text-xs">—</span>;
      const risk = risks.find((r) => r.id === riskId);
      if (!risk) return <span className="text-gray-400 text-xs">—</span>;
      const sev = risk.severity;
      const sevColor =
        sev >= 15 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        sev >= 8  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      return (
        <span className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[90px]" title={risk.title}>
            {risk.title}
          </span>
          <span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${sevColor}`}>
            {sev}
          </span>
        </span>
      );
    },
  },
];
}

export default function IssueTrackerPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Auto-escalate priority to 'high' when overdue and still open
  const handleUpdate = (issues: Issue[]) => {
    const withAutoEscalation = issues.map((i) => {
      if (
        (i.status === 'open' || i.status === 'in-progress') &&
        i.dueDate && new Date(i.dueDate) < today &&
        (i.priority === 'medium' || i.priority === 'low')
      ) {
        return { ...i, priority: 'high' as const };
      }
      return i;
    });
    updateModule(projectId, 'issues', withAutoEscalation);
  };

  const overdueCount = project.issues.filter(
    (i) => (i.status === 'open' || i.status === 'in-progress') &&
    i.dueDate && new Date(i.dueDate) < today
  ).length;

  const riskSummary = project.risks.map((r) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
  }));

  const columns = buildColumns(riskSummary);

  const createIssue = (): Issue => ({
    id: generateId(),
    title: '',
    description: '',
    priority: 'medium',
    owner: '',
    status: 'open',
    resolution: '',
    dueDate: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <AlertCircle size={24} />
        Issue Tracker
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['open', 'in-progress', 'blocked', 'resolved'] as const).map((status) => {
          const count = project.issues.filter((i) => i.status === status).length;
          const colors: Record<string, string> = {
            open: 'border-blue-200 dark:border-blue-800',
            'in-progress': 'border-amber-200 dark:border-amber-800',
            blocked: 'border-red-200 dark:border-red-800',
            resolved: 'border-green-200 dark:border-green-800',
          };
          return (
            <div key={status} className={`p-3 bg-white dark:bg-gray-900 border ${colors[status]} rounded-lg text-center`}>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
              <div className="text-xs text-gray-500 capitalize">{status.replace('-', ' ')}</div>
            </div>
          );
        })}
      </div>

      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={14} />
          <span><span className="font-semibold">{overdueCount} overdue issue{overdueCount > 1 ? 's' : ''}</span> — priority auto-escalated to High.</span>
        </div>
      )}

      <EditableTable
        data={project.issues}
        columns={columns}
        onUpdate={handleUpdate}
        createRow={createIssue}
      />
    </div>
  );
}
