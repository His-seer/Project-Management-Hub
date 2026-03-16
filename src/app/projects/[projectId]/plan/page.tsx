'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { ProjectPlan, Deliverable, Milestone, BudgetItem } from '@/types';
import { generateId } from '@/lib/ids';
import { FolderKanban, Plus, X } from 'lucide-react';
import { useState } from 'react';

const deliverableColumns: Column<Deliverable>[] = [
  { key: 'name', label: 'Name', width: '18%' },
  { key: 'description', label: 'Description', width: '22%' },
  { key: 'acceptanceCriteria', label: 'Acceptance Criteria', width: '22%' },
  { key: 'dueDate', label: 'Due Date', type: 'date', width: '12%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'accepted', label: 'Accepted' },
    ],
    width: '12%',
  },
];

const milestoneColumns: Column<Milestone>[] = [
  { key: 'name', label: 'Milestone', width: '40%' },
  { key: 'dueDate', label: 'Due Date', type: 'date', width: '25%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'on-track', label: 'On Track' },
      { value: 'at-risk', label: 'At Risk' },
      { value: 'completed', label: 'Completed' },
      { value: 'missed', label: 'Missed' },
    ],
    width: '25%',
  },
];

const budgetColumns: Column<BudgetItem>[] = [
  { key: 'category', label: 'Category', width: '30%' },
  { key: 'planned', label: 'Planned ($)', type: 'number', width: '20%' },
  { key: 'actual', label: 'Actual ($)', type: 'number', width: '20%' },
  {
    key: 'variance',
    label: 'Variance ($)',
    width: '20%',
    editable: false,
    render: (_, row) => {
      const v = row.planned - row.actual;
      const color = v >= 0 ? 'text-green-600' : 'text-red-600';
      return <span className={`font-medium ${color}`}>{v.toLocaleString()}</span>;
    },
  },
];

export default function PlanPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;
  const plan = project.plan;

  const update = (partial: Partial<ProjectPlan>) => {
    updateModule(projectId, 'plan', { ...plan, ...partial });
  };

  const handleBudgetUpdate = (items: BudgetItem[]) => {
    const updated = items.map((b) => ({ ...b, variance: b.planned - b.actual }));
    update({ budget: updated });
  };

  const handleMilestoneUpdate = (items: Milestone[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const withAutoStatus = items.map((m) => {
      if (m.status === 'completed') return m;
      if (m.dueDate && new Date(m.dueDate) < today) {
        return { ...m, status: 'missed' as const };
      }
      return m;
    });
    update({ milestones: withAutoStatus });
  };

  const budgetOverrun = plan.budget.some((b) => b.actual > b.planned);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FolderKanban size={24} />
        Project Plan
      </h1>

      <div className="space-y-6">
        <Section label="Purpose">
          <textarea
            value={plan.purpose}
            onChange={(e) => update({ purpose: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="What is the purpose of this project?"
          />
        </Section>

        <ListSection
          label="Goals"
          items={plan.goals}
          onChange={(items) => update({ goals: items })}
          placeholder="Add a goal"
        />

        <Section label="Deliverables">
          <EditableTable
            data={plan.deliverables}
            columns={deliverableColumns}
            onUpdate={(d) => update({ deliverables: d })}
            createRow={(): Deliverable => ({
              id: generateId(),
              name: '',
              description: '',
              acceptanceCriteria: '',
              dueDate: '',
              status: 'pending',
            })}
          />
        </Section>

        <Section label="Milestones">
          <EditableTable
            data={plan.milestones}
            columns={milestoneColumns}
            onUpdate={handleMilestoneUpdate}
            createRow={(): Milestone => ({
              id: generateId(),
              name: '',
              dueDate: '',
              status: 'upcoming',
            })}
          />
        </Section>

        <Section label="Budget">
          {budgetOverrun && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              <span className="font-semibold">⚠ Budget overrun:</span> one or more line items have actual spend exceeding the planned budget.
            </div>
          )}
          <EditableTable
            data={plan.budget}
            columns={budgetColumns}
            onUpdate={handleBudgetUpdate}
            createRow={() => ({
              id: generateId(),
              category: '',
              planned: 0,
              actual: 0,
              variance: 0,
            })}
          />
        </Section>

        <ListSection
          label="Quality Standards"
          items={plan.qualityStandards}
          onChange={(items) => update({ qualityStandards: items })}
          placeholder="Add a quality standard"
        />

        <ListSection
          label="Procurement Needs"
          items={plan.procurementNeeds}
          onChange={(items) => update({ procurementNeeds: items })}
          placeholder="Add a procurement need"
        />
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</h2>
      {children}
    </div>
  );
}

function ListSection({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    if (input.trim()) {
      onChange([...items, input.trim()]);
      setInput('');
    }
  };

  return (
    <Section label={label}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">{item}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder={placeholder}
          />
          <button
            onClick={add}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </Section>
  );
}
