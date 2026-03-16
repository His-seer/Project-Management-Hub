'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { ActionItem } from '@/types';
import { generateId } from '@/lib/ids';
import { CheckSquare, AlertTriangle } from 'lucide-react';
import { useScreenshotExport } from '@/hooks/useScreenshotExport';

const columns: Column<ActionItem>[] = [
  { key: 'title', label: 'Action', width: '20%' },
  { key: 'description', label: 'Description', width: '20%' },
  { key: 'owner', label: 'Owner', width: '10%' },
  { key: 'dueDate', label: 'Due', type: 'date', width: '10%' },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
    width: '9%',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'done', label: 'Done' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    width: '10%',
  },
  {
    key: 'source',
    label: 'Source',
    type: 'select',
    options: [
      { value: 'meeting', label: 'Meeting' },
      { value: 'risk', label: 'Risk' },
      { value: 'issue', label: 'Issue' },
      { value: 'decision', label: 'Decision' },
      { value: 'other', label: 'Other' },
    ],
    width: '9%',
  },
  { key: 'sourceRef', label: 'Reference', width: '12%' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  low: 'text-green-600 bg-green-50 dark:bg-green-900/20',
};

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function ActionsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const { contentRef, exporting, exportPdf, captureImage } = useScreenshotExport('Action Items');

  if (!project) return null;

  const items = project.actionItems ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const open = items.filter((a) => a.status === 'open' || a.status === 'in-progress');
  const overdue = open.filter((a) => a.dueDate && new Date(a.dueDate) < today);
  const highPriority = open.filter((a) => a.priority === 'high');
  const done = items.filter((a) => a.status === 'done');

  return (
    <div ref={contentRef} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare size={24} />
          Action Item Register
        </h1>
        <button
          onClick={exportPdf}
          disabled={exporting || items.length === 0}
          className="btn-secondary print-hide disabled:opacity-40"
        >
          {exporting ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open', value: open.length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
          { label: 'High Priority', value: highPriority.length, color: highPriority.length > 0 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
          { label: 'Done', value: done.length, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-4 ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Overdue actions ({overdue.length}):</span>{' '}
            {overdue.map((a) => a.title || 'Untitled').join(', ')}
          </div>
        </div>
      )}

      {/* Table with custom row render for overdue highlight */}
      <div className="pm-card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No action items yet. Add one below.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[22%]">Action</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[18%]">Description</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[10%]">Owner</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[9%]">Due</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[8%]">Priority</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[9%]">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[8%]">Source</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-[16%]">Reference</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isOverdue = (item.status === 'open' || item.status === 'in-progress') &&
                    item.dueDate && new Date(item.dueDate) < today;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 dark:border-gray-800 ${isOverdue ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        {isOverdue && <span className="text-red-500 mr-1">⚠</span>}
                        {item.title || '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{item.description || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.owner || '—'}</td>
                      <td className={`px-3 py-2 text-xs font-medium ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {item.dueDate || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[item.priority] || ''}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[item.status] || ''}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 capitalize">{item.source}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{item.sourceRef || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editable table for adding/editing */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Add / Edit Action Items</h2>
        <EditableTable
          data={items}
          columns={columns}
          onUpdate={(data) => updateModule(projectId, 'actionItems', data)}
          createRow={(): ActionItem => ({
            id: generateId(),
            title: '',
            description: '',
            owner: '',
            dueDate: '',
            status: 'open',
            priority: 'medium',
            source: 'other',
            sourceRef: '',
            createdAt: new Date().toISOString(),
          })}
        />
      </div>
    </div>
  );
}
