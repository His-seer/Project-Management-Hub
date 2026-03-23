'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { calculateCompleteness, overallCompleteness } from '@/lib/completeness';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import { useAiStore } from '@/stores/useAiStore';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Target,
  TrendingUp,
  Activity,
  Clock,
  ArrowRight,
  FileBarChart,
  Printer,
  DollarSign,
  Gauge,
  Bookmark,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { generateId } from '@/lib/ids';
import { useScreenshotExport } from '@/hooks/useScreenshotExport';
import { ScreenshotPrint } from '@/components/print/ScreenshotPrint';
import { DataManagement } from '@/components/shared/DataManagement';

const HEALTH_CONFIG = {
  green:  { label: 'On Track',  bg: 'bg-emerald-500', text: 'text-emerald-600', badge: 'badge-green', bar: '#10b981' },
  amber:  { label: 'At Risk',   bg: 'bg-amber-500',   text: 'text-amber-600',  badge: 'badge-amber', bar: '#f59e0b' },
  red:    { label: 'Critical',  bg: 'bg-red-500',     text: 'text-red-600',    badge: 'badge-red',   bar: '#ef4444' },
};

const STATUS_CONFIG: Record<string, string> = {
  active: 'badge-green', 'on-hold': 'badge-amber', completed: 'badge-blue', cancelled: 'badge-gray',
};

const MILESTONE_STATUS: Record<string, { cls: string; label: string }> = {
  upcoming:  { cls: 'badge-gray',  label: 'Upcoming' },
  'on-track':{ cls: 'badge-green', label: 'On Track' },
  'at-risk': { cls: 'badge-amber', label: 'At Risk' },
  completed: { cls: 'badge-blue',  label: 'Done' },
  missed:    { cls: 'badge-red',   label: 'Missed' },
};

export default function ProjectOverview() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const updateModule = useProjectStore((s) => s.updateModule);
  // Hook must be called before any early returns (React rules of hooks)
  const { contentRef, exporting, exportPdf, captureImage } = useScreenshotExport('Project Overview');

  const selectedModel = useAiStore((s) => s.model);
  const [aiInsights, setAiInsights] = useState<Array<{ id: string; type: 'warning' | 'suggestion' | 'positive'; title: string; detail: string; module: string }>>([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string>('');
  const [insightsDismissed, setInsightsDismissed] = useState<Set<string>>(new Set());
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!project) return;
    setAiInsightsLoading(true);
    setAiInsightsError('');
    try {
      const res = await apiFetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, model: selectedModel }),
      });
      const raw = await readSseStream(res);
      const parsed = parseAiJson<{ insights: typeof aiInsights } | typeof aiInsights>(raw);
      const insights = Array.isArray(parsed) ? parsed : parsed.insights;
      setAiInsights(insights);
      setInsightsDismissed(new Set());
      setInsightsExpanded(true);
    } catch (err: unknown) {
      setAiInsightsError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setAiInsightsLoading(false);
    }
  }, [project, selectedModel]);

  if (!project) return null;

  const { meta } = project;
  const hc = HEALTH_CONFIG[meta.health];
  const openRisks = project.risks.filter((r) => r.status === 'open' || r.status === 'mitigating');
  const criticalRisks = project.risks.filter((r) => r.severity >= 15 && r.status !== 'closed');
  const openIssues = project.issues.filter((i) => i.status !== 'closed' && i.status !== 'resolved');
  const blockedIssues = project.issues.filter((i) => i.status === 'blocked');
  const pct = overallCompleteness(project);
  const completeness = calculateCompleteness(project);
  const incompleteModules = completeness.filter((c) => !c.complete).slice(0, 5);
  const upcomingMilestones = project.plan.milestones
    .filter((m) => m.status !== 'completed' && m.status !== 'missed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  // Charts data
  const riskPieData = [
    { name: 'Critical (15-25)', value: project.risks.filter((r) => r.severity >= 15).length, color: '#ef4444' },
    { name: 'High (8-14)',      value: project.risks.filter((r) => r.severity >= 8 && r.severity < 15).length, color: '#f59e0b' },
    { name: 'Medium (4-7)',     value: project.risks.filter((r) => r.severity >= 4 && r.severity < 8).length, color: '#6366f1' },
    { name: 'Low (1-3)',        value: project.risks.filter((r) => r.severity < 4).length, color: '#10b981' },
  ].filter((d) => d.value > 0);

  const completenessBarData = completeness
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8)
    .map((c) => ({
      name: c.label.replace(' ', '\n').slice(0, 12),
      pct: c.percentage,
      fill: c.percentage >= 80 ? '#10b981' : c.percentage >= 40 ? '#f59e0b' : '#ef4444',
    }));

  // Auto-compute suggested health from project data
  const missedMilestones = project.plan.milestones.filter(
    (m) => m.status === 'missed' ||
    (m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed')
  );
  const budgetOverrun = project.plan.budget.some((b) => b.actual > b.planned);
  const overdueActions = (project.actionItems ?? []).filter(
    (a) => (a.status === 'open' || a.status === 'in-progress') &&
    a.dueDate && new Date(a.dueDate) < new Date()
  );
  const overdueComms = project.communications.filter(
    (c) => c.nextDue && new Date(c.nextDue) < new Date()
  );
  const overdueAssumptions = project.assumptions.filter(
    (a) => a.targetValidationDate &&
    new Date(a.targetValidationDate) < new Date() &&
    a.validationStatus !== 'validated' &&
    a.validationStatus !== 'invalidated'
  );
  const overAllocatedResources = project.resources.filter((r) => r.allocationPercent > 100);
  const computedHealth: 'green' | 'amber' | 'red' =
    criticalRisks.length > 0 || blockedIssues.length > 0 || missedMilestones.length > 0
      ? 'red'
      : openRisks.length > 2 || openIssues.length > 3 || budgetOverrun
      ? 'amber'
      : 'green';

  const daysSinceStart = meta.startDate
    ? Math.floor((Date.now() - new Date(meta.startDate).getTime()) / 86400000)
    : 0;
  const totalDays = meta.startDate && meta.targetEndDate
    ? Math.floor((new Date(meta.targetEndDate).getTime() - new Date(meta.startDate).getTime()) / 86400000)
    : 0;
  const timeElapsedPct = totalDays > 0 ? Math.min(100, Math.round((daysSinceStart / totalDays) * 100)) : 0;

  // Budget metric: total actual spend vs totalBudget
  const totalActualSpend = project.plan.budget.reduce((s, b) => s + (b.actual || 0), 0);
  const totalBudget = project.funding.totalBudget || 0;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalActualSpend / totalBudget) * 100) : 0;
  const budgetColor = budgetUsedPct > 100 ? 'red' : budgetUsedPct > 80 ? 'amber' : 'emerald';
  const budgetSub = totalBudget > 0
    ? `$${totalActualSpend.toLocaleString()} / $${totalBudget.toLocaleString()}`
    : 'No budget set';

  // Schedule Performance Index: completeness% / timeElapsed%
  // SPI < 0.8 = behind schedule (red), 0.8–1.0 = slight risk (amber), >=1.0 = on track (emerald)
  const spi = timeElapsedPct > 0 ? Math.round((pct / timeElapsedPct) * 100) / 100 : null;
  const spiColor = spi === null ? 'blue' : spi < 0.8 ? 'red' : spi < 1.0 ? 'amber' : 'emerald';
  const spiLabel = spi === null ? 'No timeline set' : spi < 0.8 ? 'Behind schedule' : spi < 1.0 ? 'Slight risk' : 'On schedule';

  // EAC (Estimate at Completion) = totalBudget / CPI, where CPI ≈ SPI (cost/schedule are coupled here)
  // Projected end date = startDate + totalDays / SPI
  const eac = totalBudget > 0 && spi && spi > 0
    ? Math.round(totalBudget / spi)
    : null;
  const eacOverrun = eac !== null && totalBudget > 0 ? eac - totalBudget : 0;
  const eacColor = eac === null ? 'slate' : eacOverrun > 0 ? 'red' : 'emerald';
  const eacSub = eac === null
    ? 'Set budget + timeline'
    : eacOverrun > 0
    ? `+$${eacOverrun.toLocaleString()} over budget`
    : `$${(totalBudget - eac).toLocaleString()} under budget`;

  const projectedEndDate = spi && spi > 0 && meta.startDate && totalDays > 0
    ? new Date(new Date(meta.startDate).getTime() + (totalDays / spi) * 86400000)
      .toISOString().split('T')[0]
    : null;
  const projectedEndColor = projectedEndDate && meta.targetEndDate
    ? projectedEndDate > meta.targetEndDate ? 'red' : 'emerald'
    : 'slate';

  return (
    <>
    {captureImage && <ScreenshotPrint meta={meta} title="Project Overview" subtitle={meta.description} captureImage={captureImage} />}
    <div ref={contentRef} className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{meta.name}</h1>
            <span className={`badge-${meta.health === 'green' ? 'green' : meta.health === 'amber' ? 'amber' : 'red'} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hc.bg}`} />
              {hc.label}
            </span>
            <span className={STATUS_CONFIG[meta.status] || 'badge-gray'} style={{ textTransform: 'capitalize' }}>
              {meta.status.replace('-', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{meta.description}</p>
          {meta.startDate && (
            <p className="text-xs text-slate-400 mt-0.5">
              {meta.startDate} → {meta.targetEndDate || 'TBD'}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <DataManagement projectId={projectId} compact />
          <button
            onClick={() => {
              const name = prompt('Baseline name:', `Baseline ${(project.baselines?.length ?? 0) + 1} — ${new Date().toISOString().split('T')[0]}`);
              if (!name) return;
              const snapshot = {
                id: generateId(),
                name,
                createdAt: new Date().toISOString(),
                milestones: JSON.parse(JSON.stringify(project.plan.milestones)),
                budget: JSON.parse(JSON.stringify(project.plan.budget)),
                ganttTasks: JSON.parse(JSON.stringify(project.gantt.tasks)),
                kpis: JSON.parse(JSON.stringify(project.kpis)),
              };
              const baselines = [...(project.baselines ?? []), snapshot].slice(-10);
              updateModule(projectId, 'baselines', baselines);
            }}
            className="btn-secondary print-hide"
          >
            <Bookmark size={15} />
            Take Baseline
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="btn-secondary print-hide disabled:opacity-50"
          >
            <Printer size={15} />
            {exporting ? 'Preparing…' : 'Export PDF'}
          </button>
          <HealthControl
            projectId={projectId}
            metaHealth={meta.health}
            computedHealth={computedHealth}
            healthOverrideReason={meta.healthOverrideReason}
            updateMeta={updateMeta}
          />
          <StatusControl
            projectId={projectId}
            status={meta.status}
            hasMilestones={project.plan.milestones.length > 0}
            hasRisks={project.risks.length > 0}
            hasBudget={project.funding.totalBudget > 0 || project.plan.budget.length > 0}
            hasLessons={project.lessons.length > 0}
            hasOpenCriticalIssues={project.issues.some((i) => i.priority === 'critical' && i.status !== 'resolved' && i.status !== 'closed')}
            updateMeta={updateMeta}
          />
        </div>
      </div>

      {/* ── Alerts ── */}
      {budgetOverrun && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">⚠ Budget overrun:</span> one or more budget line items exceed planned spend.{' '}
          <Link href={`/projects/${projectId}/plan`} className="underline">View Plan →</Link>
        </div>
      )}
      {overdueActions.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <span className="font-semibold">⚠ Overdue action items ({overdueActions.length}):</span>{' '}
          {overdueActions.slice(0, 3).map((a) => a.title || 'Untitled').join(', ')}
          {overdueActions.length > 3 && ` +${overdueActions.length - 3} more`}.{' '}
          <Link href={`/projects/${projectId}/actions`} className="underline">View Actions →</Link>
        </div>
      )}
      {overdueComms.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">⚠ Overdue communications ({overdueComms.length}):</span>{' '}
          {overdueComms.map((c) => c.name || 'Unnamed').join(', ')}.{' '}
          <Link href={`/projects/${projectId}/communications`} className="underline">View Comms Plan →</Link>
        </div>
      )}
      {overdueAssumptions.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">⚠ Assumptions overdue for validation ({overdueAssumptions.length}):</span>{' '}
          {overdueAssumptions.slice(0, 2).map((a) => a.assumption?.slice(0, 40) || 'Untitled').join('; ')}
          {overdueAssumptions.length > 2 && ` +${overdueAssumptions.length - 2} more`}.{' '}
          <Link href={`/projects/${projectId}/assumptions`} className="underline">View Assumptions →</Link>
        </div>
      )}
      {overAllocatedResources.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">⚠ Over-allocated resources ({overAllocatedResources.length}):</span>{' '}
          {overAllocatedResources.map((r) => `${r.name || 'Unnamed'} (${r.allocationPercent}%)`).join(', ')}.{' '}
          <Link href={`/projects/${projectId}/resources`} className="underline">View Resources →</Link>
        </div>
      )}
      {(criticalRisks.length > 0 || blockedIssues.length > 0) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
            <AlertTriangle size={15} />
            Immediate Attention Required
          </h3>
          <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
            {criticalRisks.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                Critical risk: <Link href={`/projects/${projectId}/risks`} className="underline">{r.title}</Link> (score: {r.severity})
              </li>
            ))}
            {blockedIssues.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                Blocked issue: <Link href={`/projects/${projectId}/issues`} className="underline">{i.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── AI Insights ── */}
      <div className="pm-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
          onClick={() => setInsightsExpanded(!insightsExpanded)}
        >
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Sparkles size={15} className="text-purple-500" />
            AI Insights
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchInsights(); }}
              disabled={aiInsightsLoading}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              <RefreshCw size={12} className={aiInsightsLoading ? 'animate-spin' : ''} />
              {aiInsightsLoading ? 'Loading...' : 'Refresh'}
            </button>
            {insightsExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </div>
        </div>
        {insightsExpanded && (
          <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-800">
            {aiInsightsError && (
              <p className="text-sm text-red-500 mt-3">{aiInsightsError}</p>
            )}
            {aiInsights.length === 0 && !aiInsightsLoading && !aiInsightsError && (
              <p className="text-sm text-slate-400 mt-3">Click Refresh to generate AI insights for your project.</p>
            )}
            {aiInsights.filter((ins) => !insightsDismissed.has(ins.id)).length > 0 && (
              <div className="space-y-2 mt-3">
                {aiInsights
                  .filter((ins) => !insightsDismissed.has(ins.id))
                  .map((ins) => {
                    const iconMap = {
                      warning: <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />,
                      suggestion: <Lightbulb size={14} className="text-blue-500 flex-shrink-0" />,
                      positive: <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />,
                    };
                    const bgMap = {
                      warning: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
                      suggestion: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
                      positive: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
                    };
                    return (
                      <div key={ins.id} className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap[ins.type]}`}>
                        <div className="mt-0.5">{iconMap[ins.type]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{ins.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ins.detail}</div>
                          {ins.module && (
                            <Link href={`/projects/${projectId}/${ins.module}`} className="text-xs text-indigo-500 hover:underline mt-1 inline-block">
                              Go to {ins.module} →
                            </Link>
                          )}
                        </div>
                        <button
                          onClick={() => setInsightsDismissed((prev) => new Set(prev).add(ins.id))}
                          className="text-slate-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<Target size={18} />}
          label="Overall Completeness"
          value={`${pct}%`}
          sub={`${completeness.filter((c) => c.complete).length}/${completeness.length} modules done`}
          color="indigo"
          href={`/projects/${projectId}/completeness`}
          projectId={projectId}
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Open Risks"
          value={openRisks.length.toString()}
          sub={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : 'No critical risks'}
          color={criticalRisks.length > 0 ? 'red' : 'amber'}
          href={`/projects/${projectId}/risks`}
          projectId={projectId}
        />
        <MetricCard
          icon={<AlertCircle size={18} />}
          label="Open Issues"
          value={openIssues.length.toString()}
          sub={blockedIssues.length > 0 ? `${blockedIssues.length} blocked` : 'None blocked'}
          color={blockedIssues.length > 0 ? 'red' : 'emerald'}
          href={`/projects/${projectId}/issues`}
          projectId={projectId}
        />
        <MetricCard
          icon={<Clock size={18} />}
          label="Timeline Progress"
          value={`${timeElapsedPct}%`}
          sub={totalDays > 0 ? `${Math.max(0, totalDays - daysSinceStart)} days remaining` : 'No end date set'}
          color="blue"
          href={`/projects/${projectId}/gantt`}
          projectId={projectId}
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          label="Budget Spent"
          value={totalBudget > 0 ? `${budgetUsedPct}%` : '—'}
          sub={budgetSub}
          color={budgetColor}
          href={`/projects/${projectId}/plan`}
          projectId={projectId}
        />
        <MetricCard
          icon={<Gauge size={18} />}
          label="Schedule Performance"
          value={spi !== null ? `${spi.toFixed(2)}` : '—'}
          sub={spiLabel}
          color={spiColor}
          href={`/projects/${projectId}/gantt`}
          projectId={projectId}
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          label="Forecast Cost (EAC)"
          value={eac !== null ? `$${eac.toLocaleString()}` : '—'}
          sub={eacSub}
          color={eacColor}
          href={`/projects/${projectId}/plan`}
          projectId={projectId}
        />
        <MetricCard
          icon={<Calendar size={18} />}
          label="Projected End Date"
          value={projectedEndDate ?? '—'}
          sub={projectedEndDate && meta.targetEndDate
            ? projectedEndDate > meta.targetEndDate
              ? `Target: ${meta.targetEndDate} (late)`
              : `Target: ${meta.targetEndDate} (on time)`
            : 'Set budget + SPI first'}
          color={projectedEndColor}
          href={`/projects/${projectId}/gantt`}
          projectId={projectId}
        />
      </div>

      {/* ── Progress bars ── */}
      <div className="pm-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Activity size={15} className="text-indigo-500" />
            Project Snapshot
          </h2>
          <Link href={`/projects/${projectId}/status-report`} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
            <FileBarChart size={12} />
            Status Report
          </Link>
        </div>
        <div className="space-y-3">
          <ProgressRow label="Overall Completeness" pct={pct} color={pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'} />
          <ProgressRow label="Timeline Elapsed" pct={timeElapsedPct} color="#6366f1" />
          {project.risks.length > 0 && (
            <ProgressRow
              label="Risks Mitigated"
              pct={Math.round((project.risks.filter((r) => r.status === 'closed' || r.status === 'accepted').length / project.risks.length) * 100)}
              color="#10b981"
            />
          )}
          {project.plan.milestones.length > 0 && (
            <ProgressRow
              label="Milestones Complete"
              pct={Math.round((project.plan.milestones.filter((m) => m.status === 'completed').length / project.plan.milestones.length) * 100)}
              color="#8b5cf6"
            />
          )}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Module completeness chart */}
        <div className="pm-card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" />
            Module Completeness
          </h2>
          {completenessBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={completenessBarData} layout="vertical" margin={{ left: 8, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Completeness']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {completenessBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No module data yet.</p>
          )}
        </div>

        {/* Risk distribution pie */}
        <div className="pm-card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Risk Distribution by Severity
          </h2>
          {riskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <p className="text-sm text-slate-400">No risks registered yet.</p>
              <Link href={`/projects/${projectId}/risks`} className="text-xs text-indigo-500 hover:underline">Add risks →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Milestones + Incomplete Modules ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Upcoming milestones */}
        <div className="pm-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Calendar size={15} className="text-indigo-500" />
              Upcoming Milestones
            </h2>
            <Link href={`/projects/${projectId}/plan`} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {upcomingMilestones.length > 0 ? (
            <ul className="space-y-2">
              {upcomingMilestones.map((m) => {
                const ms = MILESTONE_STATUS[m.status] ?? MILESTONE_STATUS.upcoming;
                const isOverdue = m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed';
                return (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 truncate mr-2">{m.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{m.dueDate}</span>
                      <span className={ms.cls}>{ms.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No milestones defined.</p>
              <Link href={`/projects/${projectId}/plan`} className="text-xs text-indigo-500 hover:underline mt-1 inline-block">Add in Project Plan →</Link>
            </div>
          )}
        </div>

        {/* Incomplete modules */}
        <div className="pm-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-indigo-500" />
              Needs Attention
            </h2>
            <Link href={`/projects/${projectId}/completeness`} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              Full checklist <ArrowRight size={11} />
            </Link>
          </div>
          {incompleteModules.length > 0 ? (
            <ul className="space-y-2">
              {incompleteModules.map((c) => (
                <Link
                  key={c.module}
                  href={`/projects/${projectId}/${c.module}`}
                  className="flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors group"
                >
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-500 flex-shrink-0" />
                    {c.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.percentage}%`,
                          background: c.percentage >= 50 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{c.percentage}%</span>
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <p className="text-sm text-slate-400">All modules complete!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Issues ── */}
      {openIssues.length > 0 && (
        <div className="pm-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" />
              Open Issues
            </h2>
            <Link href={`/projects/${projectId}/issues`} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 pr-4">Issue</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 pr-4">Priority</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 pr-4">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {openIssues.slice(0, 5).map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{i.title}</td>
                    <td className="py-2 pr-4">
                      <span className={`badge-${i.priority === 'critical' || i.priority === 'high' ? 'red' : i.priority === 'medium' ? 'amber' : 'gray'}`}>
                        {i.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge-${i.status === 'blocked' ? 'red' : i.status === 'in-progress' ? 'blue' : 'amber'}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400 text-xs">{i.owner || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Team ── */}
      {project.resources.length > 0 && (
        <div className="pm-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Users size={15} className="text-indigo-500" />
              Team ({project.resources.length})
            </h2>
            <Link href={`/projects/${projectId}/resources`} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.resources.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {r.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-slate-700 dark:text-slate-200 text-xs font-medium leading-tight">{r.name}</div>
                  <div className="text-slate-400 text-xs leading-tight">{r.role}</div>
                </div>
              </div>
            ))}
            {project.resources.length > 10 && (
              <div className="flex items-center px-3 py-1.5 text-xs text-slate-400">
                +{project.resources.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </>
  );
}

function StatusControl({ projectId, status, hasMilestones, hasRisks, hasBudget, hasLessons, hasOpenCriticalIssues, updateMeta }: {
  projectId: string;
  status: 'active' | 'on-hold' | 'completed' | 'cancelled';
  hasMilestones: boolean;
  hasRisks: boolean;
  hasBudget: boolean;
  hasLessons: boolean;
  hasOpenCriticalIssues: boolean;
  updateMeta: (id: string, patch: Partial<{ status: 'active' | 'on-hold' | 'completed' | 'cancelled' }>) => void;
}) {
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  const handleChange = (val: string) => {
    const newStatus = val as 'active' | 'on-hold' | 'completed' | 'cancelled';
    if (newStatus === 'active') {
      const missing: string[] = [];
      if (!hasMilestones) missing.push('at least 1 milestone (Project Plan)');
      if (!hasRisks) missing.push('at least 1 risk (Risk Register)');
      if (!hasBudget) missing.push('a budget (Funding or Project Plan)');
      if (missing.length > 0) {
        setBlockedMsg(`Cannot mark project Active. Please add: ${missing.join('; ')}.`);
        return;
      }
    }
    if (newStatus === 'completed') {
      const missing: string[] = [];
      if (!hasLessons) missing.push('Lessons Learned entry');
      if (hasOpenCriticalIssues) missing.push('resolve all critical issues first');
      if (missing.length > 0) {
        setBlockedMsg(`Cannot mark project Completed. Please: ${missing.join('; ')}.`);
        return;
      }
    }
    updateMeta(projectId, { status: newStatus });
  };

  return (
    <>
      <select value={status} onChange={(e) => handleChange(e.target.value)} className="field-input !w-auto">
        <option value="active">Active</option>
        <option value="on-hold">On Hold</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {blockedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Action Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{blockedMsg}</p>
            <div className="flex justify-end">
              <button onClick={() => setBlockedMsg(null)} className="btn-primary text-sm">Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HealthControl({ projectId, metaHealth, computedHealth, healthOverrideReason, updateMeta }: {
  projectId: string;
  metaHealth: 'green' | 'amber' | 'red';
  computedHealth: 'green' | 'amber' | 'red';
  healthOverrideReason?: string;
  updateMeta: (id: string, patch: { health: 'green' | 'amber' | 'red'; healthOverrideReason?: string }) => void;
}) {
  const [showOverride, setShowOverride] = useState(false);
  const [pendingHealth, setPendingHealth] = useState<'green' | 'amber' | 'red' | null>(null);
  const [reason, setReason] = useState('');

  // Auto-apply computed health whenever it changes (resets any prior override)
  useEffect(() => {
    updateMeta(projectId, { health: computedHealth, healthOverrideReason: undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedHealth]);

  const isOverridden = metaHealth !== computedHealth;

  const healthLabel: Record<string, string> = { green: '🟢 On Track', amber: '🟡 At Risk', red: '🔴 Critical' };
  const healthOptions: Array<'green' | 'amber' | 'red'> = ['green', 'amber', 'red'];

  const openOverride = () => {
    setPendingHealth(computedHealth === 'red' ? 'amber' : 'green');
    setReason(healthOverrideReason ?? '');
    setShowOverride(true);
  };

  const confirmOverride = () => {
    if (!reason.trim() || !pendingHealth) return;
    updateMeta(projectId, { health: pendingHealth, healthOverrideReason: reason.trim() });
    setShowOverride(false);
  };

  const clearOverride = () => {
    updateMeta(projectId, { health: computedHealth, healthOverrideReason: undefined });
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        {/* Read-only health badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
          ${metaHealth === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
          : metaHealth === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
          : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0
            ${metaHealth === 'green' ? 'bg-emerald-500' : metaHealth === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
          {healthLabel[metaHealth]}
        </div>

        {/* Override controls */}
        {isOverridden ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-500 font-medium">Overridden</span>
            <button onClick={clearOverride} className="text-[10px] text-slate-400 hover:text-red-500 underline">
              Clear
            </button>
          </div>
        ) : (
          <button onClick={openOverride} className="text-[10px] text-slate-400 hover:text-blue-500 underline">
            Override
          </button>
        )}
      </div>

      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Override Health Status
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Data computes <strong>{healthLabel[computedHealth]}</strong>. Select your override and provide a justification.
            </p>
            <div className="flex gap-2 mb-3">
              {healthOptions.filter((h) => h !== computedHealth).map((h) => (
                <button
                  key={h}
                  onClick={() => setPendingHealth(h)}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors
                    ${pendingHealth === h
                      ? h === 'green' ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : h === 'amber' ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-red-100 border-red-400 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                >
                  {healthLabel[h]}
                </button>
              ))}
            </div>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Justification required — e.g. Risk accepted by steering committee with compensating controls in place..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowOverride(false)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={confirmOverride}
                disabled={!reason.trim() || !pendingHealth}
                className="btn-primary text-sm disabled:opacity-40"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ icon, label, value, sub, color, href, projectId }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string; href: string; projectId: string;
}) {
  const colors: Record<string, { bg: string; icon: string; num: string }> = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  icon: 'text-indigo-500', num: 'text-indigo-700 dark:text-indigo-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',    icon: 'text-amber-500',  num: 'text-amber-700 dark:text-amber-300' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',        icon: 'text-red-500',    num: 'text-red-700 dark:text-red-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: 'text-emerald-500',num: 'text-emerald-700 dark:text-emerald-300' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',      icon: 'text-blue-500',   num: 'text-blue-700 dark:text-blue-300' },
  };
  const c = colors[color] ?? colors.indigo;
  return (
    <Link href={href} className="pm-card p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors mt-1" />
      </div>
      <div className={`text-2xl font-bold mt-2 ${c.num}`}>{value}</div>
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </Link>
  );
}

function ProgressRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
