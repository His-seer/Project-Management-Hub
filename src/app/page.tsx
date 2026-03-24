'use client';

import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useProjectStore } from '@/stores/useProjectStore';
import { dashboardTourSteps, TOUR_KEYS } from '@/lib/tours';

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

  const activeCount = projectList.filter((p) => p.meta.status === 'active').length;
  const atRiskCount = projectList.filter((p) => p.meta.health === 'red' || p.meta.health === 'amber').length;
  const completedCount = projectList.filter((p) => p.meta.status === 'completed').length;
  const onHoldCount = projectList.filter((p) => p.meta.status === 'on-hold').length;

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
