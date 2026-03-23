'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Risk } from '@/types';
import { generateId } from '@/lib/ids';
import { AlertTriangle, Printer, Sparkles, Check, Pencil, X } from 'lucide-react';
import { RiskRegisterPrint } from '@/components/print/RiskRegisterPrint';
import { useState } from 'react';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import { useAiStore } from '@/stores/useAiStore';
import { downloadAsPdf } from '@/lib/printExport';

const columns: Column<Risk>[] = [
  { key: 'title', label: 'Risk', width: '20%' },
  { key: 'description', label: 'Description', width: '20%' },
  { key: 'category', label: 'Category', width: '10%' },
  {
    key: 'probability',
    label: 'Prob (1-5)',
    type: 'select',
    options: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) })),
    width: '8%',
  },
  {
    key: 'impact',
    label: 'Impact (1-5)',
    type: 'select',
    options: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) })),
    width: '8%',
  },
  {
    key: 'severity',
    label: 'Score',
    width: '6%',
    editable: false,
    render: (_, row) => {
      const score = Number(row.probability) * Number(row.impact);
      const color =
        score >= 15
          ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
          : score >= 8
          ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
          : 'text-green-600 bg-green-50 dark:bg-green-900/30';
      return <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{score}</span>;
    },
  },
  { key: 'owner', label: 'Owner', width: '10%' },
  { key: 'mitigationStrategy', label: 'Mitigation', width: '15%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'mitigating', label: 'Mitigating' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'closed', label: 'Closed' },
    ],
    width: '10%',
  },
];

interface AiSuggestion {
  mitigationStrategy: string;
  contingencyPlan: string;
  suggestedOwner: string;
  reasoning: string;
}

export default function RiskRegisterPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const [exporting, setExporting] = useState(false);

  const selectedModel = useAiStore((s) => s.model);
  // AI suggestion state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiTargetRiskId, setAiTargetRiskId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiEditing, setAiEditing] = useState(false);
  const [aiEditValues, setAiEditValues] = useState<AiSuggestion | null>(null);

  if (!project) return null;

  const handleExport = async () => {
    setExporting(true);
    await downloadAsPdf('risk-register-print', `${project.meta.name} — Risk Register`);
    setExporting(false);
  };

  const handleAiSuggest = async () => {
    const targetRisk = project.risks.find(
      (r) => r.status === 'open' && !r.mitigationStrategy
    );
    if (!targetRisk) {
      setAiError('No open risks without a mitigation strategy found.');
      return;
    }

    setAiGenerating(true);
    setAiSuggestion(null);
    setAiTargetRiskId(targetRisk.id);
    setAiError(null);
    setAiEditing(false);
    setAiEditValues(null);

    try {
      const res = await apiFetch('/api/ai/risk-mitigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk: targetRisk,
          projectName: project.meta.name,
          projectDescription: project.meta.description,
          model: selectedModel,
        }),
      });
      const raw = await readSseStream(res);
      setAiSuggestion(parseAiJson<AiSuggestion>(raw));
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate suggestion.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiAccept = () => {
    if (!aiTargetRiskId) return;
    const source = aiEditing && aiEditValues ? aiEditValues : aiSuggestion;
    if (!source) return;

    const updated = project.risks.map((r) =>
      r.id === aiTargetRiskId
        ? {
            ...r,
            mitigationStrategy: source.mitigationStrategy,
            contingencyPlan: source.contingencyPlan,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    updateModule(projectId, 'risks', updated);
    setAiSuggestion(null);
    setAiTargetRiskId(null);
    setAiEditing(false);
    setAiEditValues(null);
  };

  const handleAiDismiss = () => {
    setAiSuggestion(null);
    setAiTargetRiskId(null);
    setAiError(null);
    setAiEditing(false);
    setAiEditValues(null);
  };

  const handleAiEdit = () => {
    if (aiSuggestion) {
      setAiEditing(true);
      setAiEditValues({ ...aiSuggestion });
    }
  };

  const handleUpdate = (risks: Risk[]) => {
    // Auto-calculate severity
    const updated = risks.map((r) => ({
      ...r,
      probability: Number(r.probability) as 1 | 2 | 3 | 4 | 5,
      impact: Number(r.impact) as 1 | 2 | 3 | 4 | 5,
      severity: Number(r.probability) * Number(r.impact),
    }));
    updateModule(projectId, 'risks', updated);

    // Cascade update: check if any risk changed status TO 'closed'
    const oldRisks = project.risks;
    for (const newRisk of updated) {
      const oldRisk = oldRisks.find((r) => r.id === newRisk.id);
      if (oldRisk && oldRisk.status !== 'closed' && newRisk.status === 'closed') {
        const linkedIssues = project.issues.filter(
          (issue) => issue.linkedRiskId === newRisk.id
        );
        if (linkedIssues.length > 0) {
          const confirmed = confirm(
            `Risk '${newRisk.title}' has been closed. ${linkedIssues.length} linked issue(s) found. Would you like to mark them as resolved?`
          );
          if (confirmed) {
            const updatedIssues = project.issues.map((issue) =>
              issue.linkedRiskId === newRisk.id
                ? { ...issue, status: 'resolved' as const, resolution: 'Linked risk closed' }
                : issue
            );
            updateModule(projectId, 'issues', updatedIssues);
          }
        }
      }
    }
  };

  const createRisk = (): Risk => ({
    id: generateId(),
    title: '',
    description: '',
    category: 'General',
    probability: 3,
    impact: 3,
    severity: 9,
    owner: '',
    mitigationStrategy: '',
    contingencyPlan: '',
    status: 'open',
    linkedWbsIds: [],
    linkedTaskIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Heat map data
  const heatMap = buildHeatMap(project.risks);
  const targetRiskTitle = aiTargetRiskId
    ? project.risks.find((r) => r.id === aiTargetRiskId)?.title
    : null;

  return (
    <>
    <RiskRegisterPrint risks={project.risks} meta={project.meta} />
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <h1 className="pm-page-title flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          Risk Register
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiSuggest}
            disabled={aiGenerating}
            className="btn-secondary print-hide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={15} />
            {aiGenerating ? 'Analyzing…' : 'AI Suggest'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary print-hide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={15} />
            {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* AI Error */}
      {aiError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{aiError}</span>
          <button onClick={handleAiDismiss} className="ml-2 text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* AI Suggestion Panel */}
      {aiSuggestion && (
        <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Sparkles size={16} />
              AI Suggestion for: {targetRiskTitle || 'Unknown Risk'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAiAccept}
                className="btn-secondary text-xs !py-1 !px-2 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Check size={13} /> Accept
              </button>
              <button
                onClick={handleAiEdit}
                disabled={aiEditing}
                className="btn-secondary text-xs !py-1 !px-2 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={handleAiDismiss}
                className="btn-secondary text-xs !py-1 !px-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/30"
              >
                <X size={13} /> Dismiss
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Mitigation Strategy
              </label>
              {aiEditing ? (
                <textarea
                  className="w-full border border-purple-300 dark:border-purple-700 rounded p-2 text-sm bg-white dark:bg-gray-800"
                  rows={3}
                  value={aiEditValues?.mitigationStrategy ?? ''}
                  onChange={(e) =>
                    setAiEditValues((v) => v ? { ...v, mitigationStrategy: e.target.value } : v)
                  }
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200">{aiSuggestion.mitigationStrategy}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Contingency Plan
              </label>
              {aiEditing ? (
                <textarea
                  className="w-full border border-purple-300 dark:border-purple-700 rounded p-2 text-sm bg-white dark:bg-gray-800"
                  rows={3}
                  value={aiEditValues?.contingencyPlan ?? ''}
                  onChange={(e) =>
                    setAiEditValues((v) => v ? { ...v, contingencyPlan: e.target.value } : v)
                  }
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200">{aiSuggestion.contingencyPlan}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Suggested Owner
              </label>
              {aiEditing ? (
                <input
                  className="w-full border border-purple-300 dark:border-purple-700 rounded p-2 text-sm bg-white dark:bg-gray-800"
                  value={aiEditValues?.suggestedOwner ?? ''}
                  onChange={(e) =>
                    setAiEditValues((v) => v ? { ...v, suggestedOwner: e.target.value } : v)
                  }
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200">{aiSuggestion.suggestedOwner}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Reasoning
              </label>
              {aiEditing ? (
                <textarea
                  className="w-full border border-purple-300 dark:border-purple-700 rounded p-2 text-sm bg-white dark:bg-gray-800"
                  rows={3}
                  value={aiEditValues?.reasoning ?? ''}
                  onChange={(e) =>
                    setAiEditValues((v) => v ? { ...v, reasoning: e.target.value } : v)
                  }
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200">{aiSuggestion.reasoning}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Heat Map */}
      <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Risk Heat Map</h2>
        <div className="inline-block">
          <div className="flex items-end gap-0.5">
            <div className="w-16 text-xs text-gray-500 text-right pr-2 space-y-0.5">
              {[5, 4, 3, 2, 1].map((p) => (
                <div key={p} className="h-10 flex items-center justify-end">{p}</div>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-5 gap-0.5">
                {[5, 4, 3, 2, 1].map((prob) =>
                  [1, 2, 3, 4, 5].map((imp) => {
                    const count = heatMap[`${prob}-${imp}`] || 0;
                    const score = prob * imp;
                    const bg =
                      score >= 15
                        ? 'bg-red-500'
                        : score >= 8
                        ? 'bg-amber-400'
                        : score >= 4
                        ? 'bg-yellow-300'
                        : 'bg-green-400';
                    return (
                      <div
                        key={`${prob}-${imp}`}
                        className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${bg} ${
                          count > 0 ? 'text-white' : 'text-white/50'
                        }`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 text-center text-xs text-gray-500">
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-center text-xs text-gray-500 mt-1">Impact →</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 -rotate-0 mt-1 ml-0">↑ Probability</div>
        </div>
      </div>

      {/* Risk Table */}
      <EditableTable
        data={project.risks}
        columns={columns}
        onUpdate={handleUpdate}
        createRow={createRisk}
        emptyMessage="No risks identified yet. Click 'Add Row' to add your first risk."
        exportFilename="risks"
      />
    </div>
    </>
  );
}

function buildHeatMap(risks: Risk[]): Record<string, number> {
  const map: Record<string, number> = {};
  risks
    .filter((r) => r.status !== 'closed')
    .forEach((r) => {
      const key = `${r.probability}-${r.impact}`;
      map[key] = (map[key] || 0) + 1;
    });
  return map;
}
