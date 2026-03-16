'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { GovernanceData, GovernanceRole, ApprovedTool, DecisionEntry, ComplianceCheck } from '@/types';
import { generateId } from '@/lib/ids';
import { Shield, Plus, X } from 'lucide-react';
import { useState } from 'react';

const roleColumns: Column<GovernanceRole>[] = [
  { key: 'entity', label: 'Entity', width: '20%' },
  { key: 'responsibilities', label: 'Responsibilities', width: '35%' },
  { key: 'interactions', label: 'Interactions', width: '35%' },
];

const toolColumns: Column<ApprovedTool>[] = [
  { key: 'name', label: 'Tool', width: '25%' },
  { key: 'purpose', label: 'Purpose', width: '35%' },
  { key: 'guidelines', label: 'Guidelines', width: '30%' },
];

const decisionColumns: Column<DecisionEntry>[] = [
  { key: 'date', label: 'Date', type: 'date', width: '14%' },
  { key: 'decision', label: 'Decision', width: '25%' },
  { key: 'rationale', label: 'Rationale', width: '25%' },
  { key: 'madeBy', label: 'Made By', width: '14%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'superseded', label: 'Superseded' },
      { value: 'revoked', label: 'Revoked' },
    ],
    width: '12%',
  },
];

const complianceColumns: Column<ComplianceCheck>[] = [
  { key: 'area', label: 'Area', width: '18%' },
  { key: 'requirement', label: 'Requirement', width: '30%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'compliant', label: 'Compliant' },
      { value: 'non-compliant', label: 'Non-Compliant' },
      { value: 'partial', label: 'Partial' },
      { value: 'not-assessed', label: 'Not Assessed' },
    ],
    width: '16%',
  },
  { key: 'lastChecked', label: 'Last Checked', type: 'date', width: '14%' },
];

export default function GovernancePage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const gov = project.governance;

  const update = (partial: Partial<GovernanceData>) => {
    updateModule(projectId, 'governance', { ...gov, ...partial });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Shield size={24} />
        Governance
      </h1>

      <div className="space-y-6">
        {/* Readiness & Maturity */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex gap-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Readiness Score (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={gov.readinessScore}
              onChange={(e) => update({ readinessScore: Math.min(100, Math.max(0, Number(e.target.value))) })}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Maturity Level (0-5)</label>
            <select
              value={gov.maturityLevel}
              onChange={(e) => update({ maturityLevel: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 })}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <ListSection
          label="Principles"
          items={gov.principles}
          onChange={(items) => update({ principles: items })}
          placeholder="Add a governance principle"
        />

        <Section label="Governance Roles">
          <EditableTable
            data={gov.roles}
            columns={roleColumns}
            onUpdate={(roles) => update({ roles })}
            createRow={() => ({
              id: generateId(),
              entity: '',
              responsibilities: '',
              interactions: '',
              members: [],
            })}
          />
        </Section>

        <Section label="Approved Tools">
          <EditableTable
            data={gov.approvedTools}
            columns={toolColumns}
            onUpdate={(approvedTools) => update({ approvedTools })}
            createRow={() => ({
              id: generateId(),
              name: '',
              purpose: '',
              guidelines: '',
            })}
          />
        </Section>

        <Section label="Decision Log">
          <EditableTable
            data={gov.decisionLog}
            columns={decisionColumns}
            onUpdate={(decisionLog) => update({ decisionLog })}
            createRow={() => ({
              id: generateId(),
              date: new Date().toISOString().split('T')[0],
              decision: '',
              rationale: '',
              madeBy: '',
              status: 'active' as const,
            })}
          />
        </Section>

        <Section label="Compliance Checks">
          <EditableTable
            data={gov.complianceChecks}
            columns={complianceColumns}
            onUpdate={(complianceChecks) => update({ complianceChecks })}
            createRow={() => ({
              id: generateId(),
              area: '',
              requirement: '',
              status: 'not-assessed' as const,
              lastChecked: '',
            })}
          />
        </Section>
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
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
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
          <button onClick={add} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </Section>
  );
}
