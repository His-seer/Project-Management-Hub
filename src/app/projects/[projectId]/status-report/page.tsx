'use client';

import { useState } from 'react';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAiStore } from '@/stores/useAiStore';
import type { StatusReport } from '@/types';
import { generateId } from '@/lib/ids';
import { overallCompleteness } from '@/lib/completeness';
import { StatusReportPrint } from '@/components/print/StatusReportPrint';
import { downloadAsPdf } from '@/lib/printExport';
import {
  FileBarChart,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Printer,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wand2,
} from 'lucide-react';

const statusConfig = {
  green: { label: 'On Track', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  amber: { label: 'At Risk', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  red: { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
};

export default function StatusReportPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const ai = useAiStore();
  const selectedModel = ai.provider === 'anthropic' ? ai.anthropicModel : ai.provider === 'google' ? ai.googleModel : ai.openaiModel;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiError, setAiError] = useState('');
  const [printReport, setPrintReport] = useState<StatusReport | null>(null);
  const [newReport, setNewReport] = useState<Partial<StatusReport>>({
    reportDate: new Date().toISOString().split('T')[0],
    overallStatus: (project?.meta.health ?? 'green') as 'green' | 'amber' | 'red',
    aiGenerated: false,
  });

  if (!project) return null;

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiError('');
    setAiProgress('');
    setShowNewForm(true);

    try {
      const res = await fetch('/api/ai/status-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, provider: ai.provider, model: selectedModel }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAiError(data.error ?? 'Failed to generate report');
        setAiGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.error) { setAiError(parsed.error); break; }
              if (parsed.text) { fullText += parsed.text; setAiProgress(fullText); }
            } catch { /* skip malformed */ }
          }
        }
      }

      // Parse the generated JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const generated = JSON.parse(jsonMatch[0]);
        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
        setNewReport({
          reportDate: today,
          reportingPeriod: `Week of ${weekStart} – ${today}`,
          preparedBy: '',
          overallStatus: generated.overallStatus ?? 'amber',
          executiveSummary: generated.executiveSummary ?? '',
          accomplishments: generated.accomplishments ?? [],
          nextPeriodPlans: generated.nextPeriodPlans ?? [],
          risks: generated.risks ?? '',
          issues: generated.issues ?? '',
          budgetStatus: generated.budgetStatus ?? '',
          scheduleStatus: generated.scheduleStatus ?? '',
          aiGenerated: true,
        });
        setAiProgress('');
      } else {
        setAiError('Could not parse AI response. Try again.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiGenerating(false);
    }
  };

  const reports = project.statusReports ?? [];
  const pct = overallCompleteness(project);
  const openRisks = project.risks?.filter((r) => r.status === 'open' || r.status === 'mitigating').length ?? 0;
  const openIssues = project.issues?.filter((i) => i.status === 'open' || i.status === 'in-progress' || i.status === 'blocked').length ?? 0;
  const upcomingMilestones = project.plan?.milestones?.filter((m) => m.status !== 'completed' && m.status !== 'missed').slice(0, 3) ?? [];

  const saveReport = () => {
    if (!newReport.executiveSummary) return;
    const report: StatusReport = {
      id: generateId(),
      reportDate: newReport.reportDate ?? new Date().toISOString().split('T')[0],
      reportingPeriod: newReport.reportingPeriod ?? '',
      preparedBy: newReport.preparedBy ?? '',
      overallStatus: newReport.overallStatus ?? 'green',
      executiveSummary: newReport.executiveSummary ?? '',
      accomplishments: newReport.accomplishments ?? [],
      nextPeriodPlans: newReport.nextPeriodPlans ?? [],
      risks: newReport.risks ?? '',
      issues: newReport.issues ?? '',
      budgetStatus: newReport.budgetStatus ?? '',
      scheduleStatus: newReport.scheduleStatus ?? '',
      aiGenerated: false,
    };
    updateModule(projectId, 'statusReports', [...reports, report]);
    setShowNewForm(false);
    setNewReport({ reportDate: new Date().toISOString().split('T')[0], overallStatus: 'green', aiGenerated: false });
    setExpandedId(report.id);
  };

  const handlePrint = (report: StatusReport) => {
    setPrintReport(report);
    // Wait two animation frames for React to mount StatusReportPrint, then download
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        await downloadAsPdf('status-report-print', `${project!.meta.name} — Status Report`);
        setPrintReport(null);
      });
    });
  };

  return (
    <>
    {printReport && <StatusReportPrint report={printReport} meta={project.meta} risks={project.risks} issues={project.issues} />}
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <FileBarChart size={20} className="text-indigo-500" />
            Status Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Weekly/bi-weekly executive status updates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const latest = [...reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
              if (latest) handlePrint(latest);
            }}
            disabled={reports.length === 0}
            className="btn-secondary print-hide disabled:opacity-40 disabled:cursor-not-allowed"
            title={reports.length === 0 ? 'No reports to export' : 'Export latest report as PDF'}
          >
            <Printer size={16} />
            Export PDF
          </button>
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {aiGenerating ? 'Generating…' : 'AI Generate'}
          </button>
          <button onClick={() => setShowNewForm(!showNewForm)} className="btn-primary">
            <Plus size={16} />
            New Report
          </button>
        </div>
      </div>

      {/* Project snapshot for reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="pm-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><TrendingUp size={12} /> Completeness</div>
          <div className="text-xl font-bold text-slate-800 dark:text-white">{pct}%</div>
        </div>
        <div className="pm-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><AlertTriangle size={12} /> Open Risks</div>
          <div className={`text-xl font-bold ${openRisks > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{openRisks}</div>
        </div>
        <div className="pm-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><AlertTriangle size={12} /> Open Issues</div>
          <div className={`text-xl font-bold ${openIssues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{openIssues}</div>
        </div>
        <div className="pm-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><CheckCircle2 size={12} /> Health</div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusConfig[project.meta.health ?? 'green'].dot}`} />
            <span className="text-sm font-medium text-slate-800 dark:text-white">{statusConfig[project.meta.health ?? 'green'].label}</span>
          </div>
        </div>
      </div>

      {/* AI streaming indicator */}
      {aiGenerating && (
        <div className="pm-card p-4 mb-4 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 text-sm font-medium mb-2">
            <Loader2 size={14} className="animate-spin" />
            Claude is analysing your project and generating the report…
          </div>
          {aiProgress && (
            <pre className="text-[11px] text-slate-500 dark:text-slate-400 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
              {aiProgress.substring(aiProgress.length - 400)}
            </pre>
          )}
        </div>
      )}
      {aiError && (
        <div className="pm-card p-4 mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* New Report Form */}
      {showNewForm && (
        <div className="pm-card p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">New Status Report</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Report Date</label>
              <input type="date" value={newReport.reportDate ?? ''} onChange={(e) => setNewReport({ ...newReport, reportDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reporting Period</label>
              <input type="text" placeholder="e.g. Week of March 9-13, 2026" value={newReport.reportingPeriod ?? ''} onChange={(e) => setNewReport({ ...newReport, reportingPeriod: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Prepared By</label>
              <input type="text" value={newReport.preparedBy ?? ''} onChange={(e) => setNewReport({ ...newReport, preparedBy: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overall Status</label>
              <select value={newReport.overallStatus} onChange={(e) => setNewReport({ ...newReport, overallStatus: e.target.value as 'green' | 'amber' | 'red' })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="green">Green — On Track</option>
                <option value="amber">Amber — At Risk</option>
                <option value="red">Red — Critical</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Executive Summary *</label>
            <textarea rows={4} value={newReport.executiveSummary ?? ''} onChange={(e) => setNewReport({ ...newReport, executiveSummary: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              placeholder="High-level summary of project status..." />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Budget Status</label>
              <input type="text" value={newReport.budgetStatus ?? ''} onChange={(e) => setNewReport({ ...newReport, budgetStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Schedule Status</label>
              <input type="text" value={newReport.scheduleStatus ?? ''} onChange={(e) => setNewReport({ ...newReport, scheduleStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveReport} disabled={!newReport.executiveSummary} className="btn-primary">Save Report</button>
            <button onClick={() => setShowNewForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 && !showNewForm ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <FileBarChart size={32} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-medium text-slate-600 dark:text-slate-400">No status reports yet</h3>
          <p className="text-sm text-slate-400 mt-1">Create your first report to keep stakeholders informed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate)).map((report) => {
            const cfg = statusConfig[report.overallStatus];
            const isExpanded = expandedId === report.id;
            return (
              <div key={report.id} className="pm-card">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white text-sm">
                        {report.reportingPeriod || report.reportDate}
                        {report.aiGenerated && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-indigo-500">
                            <Sparkles size={10} /> AI
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {report.reportDate} · {report.preparedBy}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrint(report); }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Print / Export"
                    >
                      <Printer size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Executive Summary</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{report.executiveSummary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {report.accomplishments?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" /> Accomplishments
                          </h3>
                          <ul className="space-y-1">
                            {report.accomplishments.map((a, i) => (
                              <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">✓</span> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.nextPeriodPlans?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Calendar size={12} className="text-indigo-500" /> Next Period
                          </h3>
                          <ul className="space-y-1">
                            {report.nextPeriodPlans.map((p, i) => (
                              <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                                <span className="text-indigo-400 mt-0.5">→</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {report.budgetStatus && (
                        <div>
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Budget</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{report.budgetStatus}</p>
                        </div>
                      )}
                      {report.scheduleStatus && (
                        <div>
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Schedule</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{report.scheduleStatus}</p>
                        </div>
                      )}
                      {report.risks && (
                        <div>
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Risks</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{report.risks}</p>
                        </div>
                      )}
                      {report.issues && (
                        <div>
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Issues</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{report.issues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
