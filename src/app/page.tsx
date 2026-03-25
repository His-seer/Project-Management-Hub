'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAiStore } from '@/stores/useAiStore';
import { dashboardTourSteps, TOUR_KEYS } from '@/lib/tours';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';

const TourStarter = dynamic(() => import('@/components/tour/TourStarter').then((m) => ({ default: m.TourStarter })), { ssr: false });
import { overallCompleteness } from '@/lib/completeness';
import { createSampleProject } from '@/lib/sampleData';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DatabaseZap,
  ExternalLink,
  Activity,
  Trash2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DataManagement } from '@/components/shared/DataManagement';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

const statusColors: Record<string, string> = {
  active: 'badge-blue',
  completed: 'badge-green',
  'on-hold': 'badge-amber',
  cancelled: 'badge-gray',
};

const healthLabel: Record<string, { label: string; dot: string }> = {
  green: { label: 'On Track', dot: 'bg-emerald-500' },
  amber: { label: 'At Risk', dot: 'bg-amber-500' },
  red: { label: 'Critical', dot: 'bg-red-500' },
};

export default function PortfolioDashboard() {
  const projects = useProjectStore((s) => s.projects);
  const importProjects = useProjectStore((s) => s.importProjects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const projectList = Object.values(projects);
  const [sampleLoaded, setSampleLoaded] = useState(
    Object.keys(projects).includes('sample-cloud-migration')
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const selectedModel = useAiStore((s) => s.model);
  const activeCount = projectList.filter((p) => p.meta.status === 'active').length;
  const atRiskCount = projectList.filter((p) => p.meta.health === 'red' || p.meta.health === 'amber').length;
  const completedCount = projectList.filter((p) => p.meta.status === 'completed').length;
  const onHoldCount = projectList.filter((p) => p.meta.status === 'on-hold').length;

  // Portfolio AI Insights
  const [portfolioInsights, setPortfolioInsights] = useState<{ title: string; detail: string; type: 'warning' | 'suggestion' | 'positive' }[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const fetchPortfolioInsights = useCallback(async () => {
    if (projectList.length === 0) return;
    setInsightsLoading(true);
    try {
      const summary = projectList.map((p) => ({
        name: p.meta.name,
        description: p.meta.description || '',
        status: p.meta.status,
        health: p.meta.health,
        completeness: `${overallCompleteness(p)}%`,
        startDate: p.meta.startDate || 'Not set',
        targetEndDate: p.meta.targetEndDate || 'Not set',
        openRisks: p.risks?.filter((r) => r.status === 'open').length ?? 0,
        highRisks: p.risks?.filter((r) => r.status === 'open' && (r.probability * r.impact) >= 12).length ?? 0,
        openIssues: p.issues?.filter((i) => i.status !== 'closed').length ?? 0,
        totalTasks: p.gantt?.tasks?.length ?? 0,
        completedTasks: p.gantt?.tasks?.filter((t) => t.progress === 100).length ?? 0,
        teamSize: p.resources?.length ?? 0,
        budgetTotal: p.plan?.budget?.reduce((s, b) => s + (b.planned ?? 0), 0) ?? 0,
        charterDefined: !!(p.charter?.vision || p.charter?.executiveSummary),
        kpiCount: p.kpis?.length ?? 0,
        stakeholderCount: p.stakeholders?.length ?? 0,
        topRisks: (p.risks ?? []).filter((r) => r.status === 'open').slice(0, 3).map((r) => r.title || r.description?.slice(0, 50)),
      }));
      const portfolioMeta = {
        totalProjects: projectList.length,
        activeProjects: activeCount,
        atRiskProjects: atRiskCount,
        completedProjects: completedCount,
        onHoldProjects: onHoldCount,
        overAllocatedResources: overAllocatedCrossProject.map((r) => `${r.name} at ${r.total}%`),
      };
      const res = await apiFetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { meta: { name: 'Portfolio Overview' }, portfolioMeta, projects: summary },
          model: selectedModel,
          systemPrompt: `You are a senior PMO director reviewing a real portfolio with ${projectList.length} project(s). You have ACTUAL project data below — analyse it specifically, not generically.

RULES:
- Reference specific project names, numbers, and data points
- Do NOT give generic advice like "define KPIs" — look at the actual data and comment on what you see
- If a project has high risks, name them. If completeness is low, say which project
- If everything looks healthy, say so with specifics
- Give 3-5 insights. Each: title (short), detail (1-2 sentences referencing real data), type ("warning"/"suggestion"/"positive")
- Return JSON: { "insights": [...] }`,
        }),
      });
      const raw = await readSseStream(res);
      const parsed = parseAiJson<{ insights: typeof portfolioInsights } | typeof portfolioInsights>(raw);
      const insights = Array.isArray(parsed) ? parsed : parsed.insights;
      setPortfolioInsights(insights);
      setInsightsOpen(true);
    } catch (e) {
      console.error('Portfolio insights failed:', e);
    } finally {
      setInsightsLoading(false);
    }
  }, [projectList, selectedModel]);

  const handleLoadSample = () => {
    const sample = createSampleProject();
    importProjects({ ...projects, [sample.meta.id]: sample });
    setSampleLoaded(true);
  };

  // Chart data: completeness per project
  const completenessData = projectList.map((p) => ({
    name: p.meta.name.length > 18 ? p.meta.name.substring(0, 18) + '…' : p.meta.name,
    value: overallCompleteness(p),
    health: p.meta.health,
  }));

  const healthColors: Record<string, string> = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

  // Cross-project resource over-allocation: sum allocationPercent by resource name across active projects
  const resourceTotals: Record<string, { total: number; projects: string[] }> = {};
  projectList
    .filter((p) => p.meta.status === 'active')
    .forEach((p) => {
      (p.resources ?? []).forEach((r) => {
        const key = (r.name || '').trim().toLowerCase();
        if (!key) return;
        if (!resourceTotals[key]) resourceTotals[key] = { total: 0, projects: [] };
        resourceTotals[key].total += r.allocationPercent ?? 0;
        resourceTotals[key].projects.push(p.meta.name);
      });
    });
  const overAllocatedCrossProject = Object.entries(resourceTotals)
    .filter(([, v]) => v.total > 100)
    .map(([name, v]) => ({ name, total: v.total, projects: v.projects }));

  // Risk/Issue summary chart
  const radarData = projectList.map((p) => ({
    name: p.meta.name.length > 14 ? p.meta.name.substring(0, 14) + '…' : p.meta.name,
    risks: p.risks?.filter((r) => r.status === 'open').length ?? 0,
    issues: p.issues?.filter((i) => i.status !== 'closed').length ?? 0,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <TourStarter steps={dashboardTourSteps} tourKey={TOUR_KEYS.DASHBOARD} />
      {/* Header */}
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <Activity size={22} className="text-indigo-500" />
            Portfolio Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {projectList.length} project{projectList.length !== 1 ? 's' : ''} across your portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataManagement compact />
          {!sampleLoaded && (
            <button onClick={handleLoadSample} className="btn-secondary">
              <DatabaseZap size={16} />
              Load Sample Project
            </button>
          )}
          <Link href="/projects/new" className="btn-primary">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      {/* Cross-project resource over-allocation warning */}
      {overAllocatedCrossProject.length > 0 && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Resource over-allocation across projects:</span>{' '}
            {overAllocatedCrossProject.map((r) => (
              <span key={r.name} className="mr-2">
                <span className="capitalize font-medium">{r.name}</span> at <span className="font-semibold text-red-600 dark:text-red-400">{r.total}%</span>
                <span className="text-xs ml-1 text-amber-500">({r.projects.join(', ')})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Active" value={activeCount} icon={<TrendingUp size={18} />} color="indigo" />
        <SummaryCard label="At Risk" value={atRiskCount} icon={<AlertTriangle size={18} />} color="amber" />
        <SummaryCard label="Completed" value={completedCount} icon={<CheckCircle2 size={18} />} color="green" />
        <SummaryCard label="On Hold" value={onHoldCount} icon={<Clock size={18} />} color="slate" />
      </div>

      {/* Portfolio AI Insights */}
      {projectList.length > 0 && (
        <div className="pm-card overflow-hidden mb-8">
          <div
            className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
            onClick={() => setInsightsOpen(!insightsOpen)}
          >
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Sparkles size={15} className="text-purple-500" />
              Portfolio AI Insights
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); fetchPortfolioInsights(); }}
                disabled={insightsLoading}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
              >
                <RefreshCw size={12} className={insightsLoading ? 'animate-spin' : ''} />
                {insightsLoading ? 'Analysing...' : portfolioInsights.length ? 'Refresh' : 'Generate'}
              </button>
              {insightsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </div>
          </div>
          {insightsOpen && portfolioInsights.length > 0 && (
            <div className="px-5 pb-4 space-y-2">
              {portfolioInsights.map((insight, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    insight.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                      : insight.type === 'positive'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300'
                  }`}
                >
                  {insight.type === 'warning' ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> : insight.type === 'positive' ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> : <Sparkles size={14} className="mt-0.5 flex-shrink-0" />}
                  <div>
                    <span className="font-medium">{insight.title}</span>
                    <span className="ml-1 opacity-80">{insight.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts row - only if projects exist */}
      {projectList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Completeness Bar Chart */}
          <div className="pm-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Project Completeness</h3>
            {completenessData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={completenessData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Completeness']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#f1f5f9' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {completenessData.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 80 ? '#10b981' : entry.value >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
            )}
          </div>

          {/* Risks & Issues Chart */}
          <div className="pm-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Open Risks & Issues</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={radarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#f1f5f9' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="risks" name="Open Risks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="issues" name="Open Issues" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Project Cards */}
      <div data-tour="projects-list" />
      {projectList.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4">
            <Activity size={24} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">No projects yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Create your first project or load the sample to get started</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleLoadSample} className="btn-secondary">
              <DatabaseZap size={15} />
              Load Sample Project
            </button>
            <Link href="/projects/new" className="btn-primary">
              <Plus size={15} />
              New Project
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">All Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectList.map((project) => {
              const pct = overallCompleteness(project);
              const h = healthLabel[project.meta.health];
              const openRisks = project.risks?.filter((r) => r.status === 'open').length ?? 0;
              const openIssues = project.issues?.filter((i) => i.status !== 'closed').length ?? 0;
              return (
                <Link
                  key={project.meta.id}
                  href={`/projects/${project.meta.id}`}
                  className="pm-card p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{project.meta.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {project.meta.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${h.dot}`} />
                      <span className="text-[11px] text-slate-500">{h.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={statusColors[project.meta.status] ?? 'badge-gray'}>
                      {project.meta.status}
                    </span>
                    {openRisks > 0 && (
                      <span className="badge-amber">{openRisks} risk{openRisks !== 1 ? 's' : ''}</span>
                    )}
                    {openIssues > 0 && (
                      <span className="badge-red">{openIssues} issue{openIssues !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Completeness</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">
                      Due {project.meta.targetEndDate ? new Date(project.meta.targetEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(project.meta.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ExternalLink size={13} className="text-slate-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project"
        message="This will permanently delete the project and all its data. This action cannot be undone."
        onConfirm={() => { deleteProject(deleteTarget!); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  };
  return (
    <div className="pm-card p-5">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colorMap[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
