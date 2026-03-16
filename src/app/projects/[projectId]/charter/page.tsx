'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Charter, CharterApproval } from '@/types';
import {
  FileText,
  Plus,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Target,
  Cpu,
  Building2,
  Shield,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { generateId } from '@/lib/ids';
import { CharterPrint } from '@/components/print/CharterPrint';
import { downloadAsPdf } from '@/lib/printExport';


export default function CharterPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const [exporting, setExporting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!project) return null;
  const charter = project.charter;

  const handleExport = async () => {
    setExporting(true);
    await downloadAsPdf('charter-print', `${project.meta.name} — Project Charter`);
    setExporting(false);
  };

  const update = (partial: Partial<Charter>) => {
    updateModule(projectId, 'charter', { ...charter, ...partial });
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiError(null);
    let raw = '';
    try {
      const res = await fetch('/api/ai/charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Request failed');
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (text) raw += text;
          } catch {}
        }
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON in response');
      const generated = JSON.parse(jsonMatch[0]);
      update(generated);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <>
    <CharterPrint charter={charter} meta={project.meta} />
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <FileText size={20} className="text-indigo-500" />
            Project Charter
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            v{charter.documentVersion || '1.0'} · Owner: {charter.documentOwner || 'Unset'} · Issued: {charter.issueDate || 'Not set'}
          </p>
        </div>
        <div className="flex gap-2 print-hide">
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto-fill charter fields using AI based on project data"
          >
            <Sparkles size={15} />
            {aiGenerating ? 'Generating…' : 'AI Auto-Fill'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={15} />
            {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
        {aiError && (
          <p className="text-xs text-red-500 print-hide">{aiError}</p>
        )}
      </div>

      <div className="space-y-5">

        {/* ── Document Control ── */}
        <SectionCard label="Document Control" icon={<FileText size={15} className="text-slate-400" />}>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Version">
              <input type="text" value={charter.documentVersion ?? ''} onChange={(e) => update({ documentVersion: e.target.value })}
                className="field-input" placeholder="1.0" />
            </Field>
            <Field label="Document Owner">
              <input type="text" value={charter.documentOwner ?? ''} onChange={(e) => update({ documentOwner: e.target.value })}
                className="field-input" placeholder="Project Manager name" />
            </Field>
            <Field label="Issue Date">
              <input type="date" value={charter.issueDate ?? ''} onChange={(e) => update({ issueDate: e.target.value })}
                className="field-input" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Executive Summary ── */}
        <SectionCard label="Executive Summary" icon={<FileText size={15} className="text-slate-400" />}>
          <p className="text-xs text-slate-400 mb-2">Summarise: definition, organisation and plan, risks and issues, assumptions and constraints.</p>
          <textarea value={charter.executiveSummary ?? ''} onChange={(e) => update({ executiveSummary: e.target.value })}
            rows={4} className="field-textarea"
            placeholder="High-level summary of the project: what it is, why it exists, key risks and how it is governed." />
        </SectionCard>

        {/* ── Project Purpose & Vision ── */}
        <SectionCard label="Project Purpose & Vision" icon={<Target size={15} className="text-slate-400" />}>
          <Field label="Project Purpose">
            <textarea value={charter.projectPurpose ?? ''} onChange={(e) => update({ projectPurpose: e.target.value })}
              rows={3} className="field-textarea"
              placeholder="What problem does this project solve? What does it deliver?" />
          </Field>
          <Field label="Vision Statement" className="mt-4">
            <textarea value={charter.vision} onChange={(e) => update({ vision: e.target.value })}
              rows={2} className="field-textarea"
              placeholder='Short, concise, achievable statement. E.g. "To deliver a scalable cloud platform by Q3 2026."' />
          </Field>
        </SectionCard>

        {/* ── Objectives ── */}
        <SectionCard label="Objectives" icon={<Target size={15} className="text-slate-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-indigo-400" /> Project Objectives
              </p>
              <ListItems items={charter.objectives} onChange={(items) => update({ objectives: items })} placeholder="Add an objective" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Building2 size={11} className="text-emerald-400" /> Business Objectives
              </p>
              <ListItems items={charter.businessObjectives ?? []} onChange={(items) => update({ businessObjectives: items })} placeholder="Add a business objective" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Cpu size={11} className="text-violet-400" /> Technology Objectives
              </p>
              <ListItems items={charter.technologyObjectives ?? []} onChange={(items) => update({ technologyObjectives: items })} placeholder="Add a technology objective" />
            </div>
          </div>
        </SectionCard>

        {/* ── Scope ── */}
        <SectionCard label="Scope" icon={<Target size={15} className="text-slate-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="In Scope">
              <textarea value={charter.scope} onChange={(e) => update({ scope: e.target.value })}
                rows={4} className="field-textarea" placeholder="What is included in this project?" />
            </Field>
            <Field label="Out of Scope">
              <textarea value={charter.outOfScope} onChange={(e) => update({ outOfScope: e.target.value })}
                rows={4} className="field-textarea" placeholder="What is explicitly NOT included?" />
            </Field>
          </div>
        </SectionCard>

        {/* ── Exclusions, Assumptions, Constraints ── */}
        <SectionCard label="Assumptions & Constraints" icon={<Shield size={15} className="text-slate-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assumptions</p>
              <ListItems items={charter.assumptions} onChange={(items) => update({ assumptions: items })} placeholder="Add an assumption" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Constraints</p>
              <ListItems items={charter.constraints} onChange={(items) => update({ constraints: items })} placeholder="Add a constraint" />
            </div>
          </div>
        </SectionCard>

        {/* ── Quality Management ── */}
        <SectionCard label="Quality Management" icon={<Shield size={15} className="text-slate-400" />}>
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quality Standards</p>
            <ListItems items={charter.qualityStandards ?? []} onChange={(items) => update({ qualityStandards: items })} placeholder="Add a quality standard" />
          </div>
          <Field label="Quality Assurance Approach">
            <textarea value={charter.qualityAssurance ?? ''} onChange={(e) => update({ qualityAssurance: e.target.value })}
              rows={3} className="field-textarea"
              placeholder="Describe how quality will be assured and controlled across deliverables." />
          </Field>
        </SectionCard>

        {/* ── Success Criteria ── */}
        <SectionCard label="Success Criteria" icon={<CheckCircle2 size={15} className="text-slate-400" />}>
          <ListItems items={charter.successCriteria} onChange={(items) => update({ successCriteria: items })} placeholder="Add a success criterion" />
        </SectionCard>

        {/* ── Sponsors ── */}
        <SectionCard label="Sponsors" icon={<Building2 size={15} className="text-slate-400" />}>
          <ListItems items={charter.sponsors} onChange={(items) => update({ sponsors: items })} placeholder="Add a sponsor (name + role)" />
        </SectionCard>

        {/* ── Approvals Table ── */}
        <SectionCard label="Approvals" icon={<CheckCircle2 size={15} className="text-slate-400" />}>
          <ApprovalsTable
            approvals={charter.approvals ?? []}
            onChange={(approvals) => update({ approvals })}
          />
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <Field label="Charter Approval Date">
              <input type="date" value={charter.approvalDate} onChange={(e) => update({ approvalDate: e.target.value })}
                className="field-input" />
            </Field>
          </div>
        </SectionCard>

      </div>
    </div>
    </>
  );
}

/* ── Small reusable pieces ── */

function SectionCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pm-card p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
        {icon}
        {label}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ListItems({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  const add = () => {
    if (input.trim()) { onChange([...items, input.trim()]); setInput(''); }
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-700 dark:text-slate-300 leading-snug">{item}</span>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-slate-300 hover:text-red-400 transition-colors mt-1.5">
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder={placeholder} />
        <button onClick={add}
          className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

const approvalRoles = ['Project Sponsor', 'Project Review Group', 'Project Manager', 'Quality Manager', 'Procurement Manager', 'Communications Manager', 'Project Office Manager'];

const statusIcon: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 size={14} className="text-emerald-500" />,
  pending: <Clock size={14} className="text-amber-500" />,
  rejected: <XCircle size={14} className="text-red-500" />,
};

function ApprovalsTable({ approvals, onChange }: { approvals: CharterApproval[]; onChange: (a: CharterApproval[]) => void }) {
  const update = (id: string, partial: Partial<CharterApproval>) => {
    onChange(approvals.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  };

  const addApproval = () => {
    const usedRoles = new Set(approvals.map((a) => a.role));
    const nextRole = approvalRoles.find((r) => !usedRoles.has(r)) ?? 'Other';
    onChange([...approvals, { id: generateId(), role: nextRole, name: '', date: '', status: 'pending' }]);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
              {['Role', 'Name', 'Status', 'Date', ''].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">No approvals yet. Click 'Add Approver'.</td>
              </tr>
            ) : (
              approvals.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-1.5">
                    <input value={a.role} onChange={(e) => update(a.id, { role: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={a.name} onChange={(e) => update(a.id, { name: e.target.value })}
                      placeholder="Full name" className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[a.status]}
                      <select value={a.status} onChange={(e) => update(a.id, { status: e.target.value as CharterApproval['status'] })}
                        className="text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-1 py-0.5">
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="date" value={a.date} onChange={(e) => update(a.id, { date: e.target.value })}
                      className="text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2 py-0.5" />
                  </td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => onChange(approvals.filter((x) => x.id !== a.id))}
                      className="text-slate-300 hover:text-red-400 transition-colors">
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button onClick={addApproval}
        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
        <Plus size={14} />
        Add Approver
      </button>
    </div>
  );
}
