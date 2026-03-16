'use client';

import { useState } from 'react';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Decision } from '@/types';
import { generateId } from '@/lib/ids';
import { ClipboardList, Plus, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

const columns: Column<Decision>[] = [
  { key: 'date', label: 'Date', type: 'date', width: '10%' },
  { key: 'title', label: 'Decision', width: '20%' },
  { key: 'rationale', label: 'Rationale', width: '20%' },
  { key: 'optionsConsidered', label: 'Options Considered', width: '20%' },
  { key: 'decidedBy', label: 'Decided By', width: '12%' },
  { key: 'impact', label: 'Impact', width: '12%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    width: '10%',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'superseded', label: 'Superseded' },
      { value: 'revoked', label: 'Revoked' },
    ],
    render: (val) => {
      const v = val as string;
      const styles: Record<string, string> = {
        active: 'badge-green',
        superseded: 'badge-amber',
        revoked: 'badge-red',
      };
      return <span className={styles[v] ?? 'badge-gray'}>{v}</span>;
    },
  },
  { key: 'reviewDate', label: 'Review Date', type: 'date', width: '10%' },
];

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle2 size={16} className="text-emerald-500" />,
  superseded: <RefreshCw size={16} className="text-amber-500" />,
  revoked: <XCircle size={16} className="text-red-500" />,
};

export default function DecisionsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const decisions = project.decisions ?? [];

  const handleUpdate = (updated: Decision[]) => {
    updateModule(projectId, 'decisions', updated);
  };

  const createRow = (): Decision => ({
    id: generateId(),
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    rationale: '',
    optionsConsidered: '',
    decidedBy: '',
    impact: '',
    status: 'active',
    reviewDate: '',
  });

  const activeCount = decisions.filter((d) => d.status === 'active').length;
  const supersededCount = decisions.filter((d) => d.status === 'superseded').length;
  const revokedCount = decisions.filter((d) => d.status === 'revoked').length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-500" />
            Decision Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track all project decisions with rationale and impact
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Decisions', count: activeCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Superseded', count: supersededCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Revoked', count: revokedCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((s) => (
          <div key={s.label} className={`pm-card p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="pm-card p-5">
        <EditableTable
          data={decisions}
          columns={columns}
          onUpdate={handleUpdate}
          createRow={createRow}
          emptyMessage="No decisions recorded yet. Click 'Add Row' to log your first decision."
        />
      </div>

      {/* Recent decisions cards */}
      {decisions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Recent Decisions</h2>
          <div className="space-y-3">
            {decisions.filter((d) => d.status === 'active').slice(0, 3).map((d) => (
              <div key={d.id} className="pm-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcons[d.status]}
                    <span className="font-medium text-slate-800 dark:text-white text-sm">{d.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">{d.date}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{d.rationale}</p>
                {d.decidedBy && (
                  <span className="text-[11px] text-slate-400">Decided by: {d.decidedBy}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
