'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { ChangeData, ChangeLogEntry, ChangeRequest } from '@/types';
import { generateId } from '@/lib/ids';
import { GitBranch, AlertTriangle, Sparkles, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import { useAiStore } from '@/stores/useAiStore';

const logColumns: Column<ChangeLogEntry>[] = [
  { key: 'version', label: 'Version', width: '12%' },
  { key: 'date', label: 'Date', type: 'date', width: '15%' },
  { key: 'description', label: 'Description', width: '45%' },
  { key: 'author', label: 'Author', width: '18%' },
];

function buildRequestColumns(risks: { id: string; title: string; severity: number }[]): Column<ChangeRequest>[] {
  return [
  { key: 'name', label: 'Name', width: '12%' },
  { key: 'requestedBy', label: 'Requested By', width: '10%' },
  { key: 'date', label: 'Date', type: 'date', width: '10%' },
  { key: 'description', label: 'Description', width: '14%' },
  { key: 'reason', label: 'Reason', width: '10%' },
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
  { key: 'impactOnDeliverables', label: 'Impact', width: '10%' },
  { key: 'costEvaluation', label: 'Cost Eval', width: '8%' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'deferred', label: 'Deferred' },
      { value: 'rejected', label: 'Rejected' },
    ],
    width: '10%',
  },
  {
    key: 'linkedRiskIds',
    label: 'Linked Risks',
    width: '10%',
    render: (value) => {
      const ids = (value as string[]) ?? [];
      if (ids.length === 0) return <span className="text-gray-400 text-xs">—</span>;
      const linked = ids.map((id) => risks.find((r) => r.id === id)).filter(Boolean) as { id: string; title: string; severity: number }[];
      const hasHigh = linked.some((r) => r.severity >= 15);
      const hasAmber = linked.some((r) => r.severity >= 8);
      const badgeColor = hasHigh
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : hasAmber
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      return (
        <span
          className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold cursor-default ${badgeColor}`}
          title={linked.map((r) => `${r.title} (sev ${r.severity})`).join(', ')}
        >
          {ids.length} risk{ids.length > 1 ? 's' : ''}
        </span>
      );
    },
  },
];
}

interface AiSuggestion {
  impactOnDeliverables: string;
  costEvaluation: string;
  riskEvaluation: string;
  qualityEvaluation: string;
  durationImpact: string;
  recommendation: string;
}

export default function ChangesPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const [tab, setTab] = useState<'log' | 'requests'>('log');

  // AI Change Impact Assessment state
  const selectedModel = useAiStore((s) => s.model);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiTargetCrId, setAiTargetCrId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Approval workflow state
  const [approvalCrId, setApprovalCrId] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'defer' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverComments, setApproverComments] = useState('');

  if (!project) return null;

  const changes = project.changes;

  const update = (partial: Partial<ChangeData>) => {
    updateModule(projectId, 'changes', { ...changes, ...partial });
  };

  const riskSummary = project.risks.map((r) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
  }));

  const requestColumns = buildRequestColumns(riskSummary);

  const pendingRequests = changes.requests.filter((r) => r.status === 'pending');
  const requestsWithHighRisk = changes.requests.filter(
    (r) => r.linkedRiskIds.some((id) => {
      const risk = riskSummary.find((rk) => rk.id === id);
      return risk && risk.severity >= 15;
    })
  );

  // AI Change Impact Assessment
  const handleAiAssess = async () => {
    const pendingCr = changes.requests.find((r) => r.status === 'pending');
    if (!pendingCr) {
      setAiError('No pending change request found to assess.');
      return;
    }

    setAiGenerating(true);
    setAiSuggestion(null);
    setAiTargetCrId(pendingCr.id);
    setAiError(null);

    try {
      const res = await apiFetch('/api/ai/change-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeRequest: pendingCr, project, model: selectedModel }),
      });
      const raw = await readSseStream(res);
      setAiSuggestion(parseAiJson<AiSuggestion>(raw));
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI assessment failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion || !aiTargetCrId) return;
    const updated = changes.requests.map((r) =>
      r.id === aiTargetCrId
        ? {
            ...r,
            impactOnDeliverables: aiSuggestion.impactOnDeliverables,
            costEvaluation: aiSuggestion.costEvaluation,
            riskEvaluation: aiSuggestion.riskEvaluation,
            qualityEvaluation: aiSuggestion.qualityEvaluation,
            durationImpact: aiSuggestion.durationImpact,
          }
        : r
    );
    update({ requests: updated });
    setAiSuggestion(null);
    setAiTargetCrId(null);
  };

  // Approval workflow
  const handleApprovalSubmit = () => {
    if (!approvalCrId || !approvalAction) return;
    if (approvalAction === 'approve' && !approverName.trim()) return;
    if ((approvalAction === 'reject' || approvalAction === 'defer') && !approverComments.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const updated = changes.requests.map((r) => {
      if (r.id !== approvalCrId) return r;
      if (approvalAction === 'approve') {
        return { ...r, status: 'accepted' as const, approvedBy: approverName.trim(), approvalDate: today, approverComments: approverComments.trim() };
      }
      if (approvalAction === 'reject') {
        return { ...r, status: 'rejected' as const, approvedBy: approverName.trim(), approvalDate: today, approverComments: approverComments.trim() };
      }
      // defer
      return { ...r, status: 'deferred' as const, approverComments: approverComments.trim() };
    });
    update({ requests: updated });
    setApprovalCrId(null);
    setApprovalAction(null);
    setApproverName('');
    setApproverComments('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <GitBranch size={24} />
        Change Management
      </h1>

      {pendingRequests.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{pendingRequests.length} pending change request{pendingRequests.length > 1 ? 's' : ''}</span> awaiting decision.
            {requestsWithHighRisk.length > 0 && (
              <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                {requestsWithHighRisk.length} linked to high-severity risks.
              </span>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['log', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'log' ? 'Change Log' : 'Change Requests'}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <EditableTable
          data={changes.log}
          columns={logColumns}
          onUpdate={(log) => update({ log })}
          createRow={() => ({
            id: generateId(),
            version: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            author: '',
          })}
          emptyMessage="No change log entries yet."
        />
      )}

      {tab === 'requests' && (
        <>
          {/* AI Assess button */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleAiAssess}
              disabled={aiGenerating || pendingRequests.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI Assess
            </button>
            {aiError && (
              <span className="text-xs text-red-600 dark:text-red-400">{aiError}</span>
            )}
          </div>

          {/* AI Suggestion Panel */}
          {aiSuggestion && (
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                <Sparkles size={14} />
                AI Impact Assessment
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Impact on Deliverables:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.impactOnDeliverables}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Cost Evaluation:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.costEvaluation}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Risk Evaluation:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.riskEvaluation}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Quality Evaluation:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.qualityEvaluation}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Duration Impact:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.durationImpact}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recommendation:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">{aiSuggestion.recommendation}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={applyAiSuggestion}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  Apply to Fields
                </button>
                <button
                  onClick={() => { setAiSuggestion(null); setAiTargetCrId(null); }}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <EditableTable
            data={changes.requests}
            columns={requestColumns}
            onUpdate={(requests) => update({ requests })}
            createRow={() => ({
              id: generateId(),
              name: '',
              requestedBy: '',
              date: new Date().toISOString().split('T')[0],
              description: '',
              reason: '',
              priority: 'medium' as const,
              impactOnDeliverables: '',
              costEvaluation: '',
              riskEvaluation: '',
              qualityEvaluation: '',
              durationImpact: '',
              status: 'pending' as const,
              approverComments: '',
              linkedRiskIds: [],
            })}
            emptyMessage="No change requests yet."
            exportFilename="change-requests"
          />

          {/* Approval Workflow Section */}
          {changes.requests.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Approval Workflow</h3>
              {changes.requests.map((cr) => {
                const isPending = cr.status === 'pending';
                const isApproved = cr.status === 'accepted' && cr.approvedBy;
                const isRejected = cr.status === 'rejected' && cr.approvedBy;
                const isDeferred = cr.status === 'deferred' && cr.approverComments;
                const isActive = approvalCrId === cr.id;

                return (
                  <div
                    key={cr.id}
                    className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {cr.name || '(Unnamed)'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          cr.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          cr.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          cr.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {cr.status}
                        </span>
                      </div>
                      {isPending && !isActive && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setApprovalCrId(cr.id); setApprovalAction('approve'); setApproverName(''); setApproverComments(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800 transition-colors"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            onClick={() => { setApprovalCrId(cr.id); setApprovalAction('reject'); setApproverName(''); setApproverComments(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 transition-colors"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                          <button
                            onClick={() => { setApprovalCrId(cr.id); setApprovalAction('defer'); setApproverName(''); setApproverComments(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-colors"
                          >
                            <Clock size={12} /> Defer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Approval info display */}
                    {isApproved && (
                      <p className="mt-1.5 text-xs text-green-600 dark:text-green-400">
                        Approved by {cr.approvedBy} on {cr.approvalDate}{cr.approverComments ? ` — ${cr.approverComments}` : ''}
                      </p>
                    )}
                    {isRejected && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        Rejected by {cr.approvedBy} on {cr.approvalDate}: {cr.approverComments}
                      </p>
                    )}
                    {isDeferred && !isApproved && !isRejected && (
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                        Deferred: {cr.approverComments}
                      </p>
                    )}

                    {/* Approval form */}
                    {isActive && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                          {approvalAction} Change Request
                        </p>
                        {(approvalAction === 'approve' || approvalAction === 'reject') && (
                          <input
                            type="text"
                            placeholder="Approver name *"
                            value={approverName}
                            onChange={(e) => setApproverName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                          />
                        )}
                        <textarea
                          placeholder={approvalAction === 'approve' ? 'Comments (optional)' : 'Comments (required) *'}
                          value={approverComments}
                          onChange={(e) => setApproverComments(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleApprovalSubmit}
                            disabled={
                              (approvalAction !== 'defer' && !approverName.trim()) ||
                              (approvalAction !== 'approve' && !approverComments.trim())
                            }
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setApprovalCrId(null); setApprovalAction(null); }}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
