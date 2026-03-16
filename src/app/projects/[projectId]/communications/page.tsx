'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { CommunicationItem } from '@/types';
import { generateId } from '@/lib/ids';
import { MessageSquare, AlertTriangle } from 'lucide-react';

const columns: Column<CommunicationItem>[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'meeting', label: 'Meeting' },
      { value: 'report', label: 'Report' },
      { value: 'email', label: 'Email' },
      { value: 'presentation', label: 'Presentation' },
    ],
    width: '10%',
  },
  { key: 'name', label: 'Name', width: '14%' },
  { key: 'audience', label: 'Audience', width: '12%' },
  { key: 'frequency', label: 'Frequency', width: '10%' },
  { key: 'owner', label: 'Owner', width: '10%' },
  { key: 'channel', label: 'Channel', width: '10%' },
  {
    key: 'lastExecuted',
    label: 'Last Done',
    type: 'date',
    width: '10%',
    render: (val) => <span className="text-gray-500 text-xs">{(val as string) || '—'}</span>,
  },
  {
    key: 'nextDue',
    label: 'Next Due',
    type: 'date',
    width: '10%',
    render: (val) => {
      const date = val as string;
      const overdue = date && new Date(date) < new Date();
      return (
        <span className={overdue ? 'text-red-600 font-semibold text-xs' : 'text-gray-500 text-xs'}>
          {overdue && '⚠ '}{date || '—'}
        </span>
      );
    },
  },
  { key: 'description', label: 'Notes', width: '14%' },
];

export default function CommunicationsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = project.communications.filter(
    (c) => c.nextDue && new Date(c.nextDue) < today
  );
  const neverExecuted = project.communications.filter((c) => !c.lastExecuted);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <MessageSquare size={24} />
        Communication Plan
      </h1>

      {/* Status summary */}
      {project.communications.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{project.communications.length}</div>
            <div className="text-xs text-gray-500">Planned</div>
          </div>
          <div className={`p-3 rounded-lg border text-center ${overdue.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className={`text-lg font-bold ${overdue.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{overdue.length}</div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
          <div className={`p-3 rounded-lg border text-center ${neverExecuted.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className={`text-lg font-bold ${neverExecuted.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{neverExecuted.length}</div>
            <div className="text-xs text-gray-500">Never Executed</div>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{overdue.length} overdue communication{overdue.length > 1 ? 's' : ''}:</span>{' '}
            {overdue.map((c) => c.name || 'Unnamed').join(', ')}. Update &quot;Last Done&quot; and &quot;Next Due&quot; after executing.
          </span>
        </div>
      )}

      <EditableTable
        data={project.communications}
        columns={columns}
        onUpdate={(data) => updateModule(projectId, 'communications', data)}
        createRow={() => ({
          id: generateId(),
          type: 'meeting' as const,
          name: '',
          audience: '',
          frequency: '',
          owner: '',
          channel: '',
          description: '',
          lastExecuted: '',
          nextDue: '',
        })}
      />

      <p className="mt-3 text-xs text-gray-400">
        Tip: After each communication, update &quot;Last Done&quot; and set the &quot;Next Due&quot; date. Overdue items surface on the project dashboard.
      </p>
    </div>
  );
}
