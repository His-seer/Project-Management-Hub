'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Kpi } from '@/types';
import { generateId } from '@/lib/ids';
import { BarChart3, Printer, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { useScreenshotExport } from '@/hooks/useScreenshotExport';
import { ScreenshotPrint } from '@/components/print/ScreenshotPrint';

const columns: Column<Kpi>[] = [
  { key: 'name', label: 'KPI Name', width: '20%' },
  { key: 'category', label: 'Category', width: '14%' },
  { key: 'target', label: 'Target', type: 'number', width: '12%' },
  { key: 'actual', label: 'Actual', type: 'number', width: '12%' },
  { key: 'unit', label: 'Unit', width: '10%' },
  {
    key: 'status',
    label: 'Status (auto)',
    width: '12%',
    editable: false,
    render: (value) => {
      const s = value as string;
      const cfg: Record<string, string> = {
        'on-track': 'badge-green',
        'at-risk': 'badge-amber',
        'off-track': 'badge-red',
      };
      const lbl: Record<string, string> = { 'on-track': 'On Track', 'at-risk': 'At Risk', 'off-track': 'Off Track' };
      return <span className={cfg[s] ?? 'badge-gray'}>{lbl[s] ?? s}</span>;
    },
  },
];

const STATUS_COLORS: Record<string, string> = {
  'on-track': 'border-green-400 bg-green-50 dark:bg-green-900/20',
  'at-risk': 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
  'off-track': 'border-red-400 bg-red-50 dark:bg-red-900/20',
};

const STATUS_DOT: Record<string, string> = {
  'on-track': 'bg-green-500',
  'at-risk': 'bg-amber-500',
  'off-track': 'bg-red-500',
};

export default function KpiPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const { contentRef, exporting, exportPdf, captureImage } = useScreenshotExport(
    project ? `${project.meta.name} — KPI Dashboard` : 'KPI Dashboard'
  );

  if (!project) return null;

  const kpis = project.kpis;

  const handleKpiUpdate = (data: typeof kpis) => {
    const today = new Date().toISOString().split('T')[0];
    const withAutoStatus = data.map((kpi) => {
      const existing = kpis.find((k) => k.id === kpi.id);
      // Auto-append trend snapshot when actual value changes
      let trend = kpi.trend ?? [];
      if (!existing || existing.actual !== kpi.actual) {
        const lastEntry = trend[trend.length - 1];
        if (!lastEntry || lastEntry.date !== today || lastEntry.value !== kpi.actual) {
          trend = [...trend, { date: today, value: kpi.actual }];
        }
      }
      if (kpi.target <= 0) return { ...kpi, trend };
      const pct = (kpi.actual / kpi.target) * 100;
      const autoStatus: 'on-track' | 'at-risk' | 'off-track' =
        pct >= 90 ? 'on-track' : pct >= 70 ? 'at-risk' : 'off-track';
      return { ...kpi, trend, status: autoStatus };
    });
    updateModule(projectId, 'kpis', withAutoStatus);
  };

  return (
    <>
    {captureImage && <ScreenshotPrint meta={project.meta} title="KPI Dashboard" captureImage={captureImage} />}
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 size={24} />
          KPI Dashboard
        </h1>
        <button
          onClick={exportPdf}
          disabled={exporting || kpis.length === 0}
          className="btn-secondary print-hide disabled:opacity-40 disabled:cursor-not-allowed"
          title={kpis.length === 0 ? 'No KPIs to export' : 'Export as PDF'}
        >
          <Printer size={16} />
          {exporting ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>

      {/* Captured area */}
      <div ref={contentRef}>
        {/* KPI Cards */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {kpis.map((kpi) => {
              const pct = kpi.target > 0 ? Math.min(100, (kpi.actual / kpi.target) * 100) : 0;
              const liveStatus: 'on-track' | 'at-risk' | 'off-track' =
                kpi.target <= 0 ? (kpi.status as 'on-track' | 'at-risk' | 'off-track') :
                pct >= 90 ? 'on-track' : pct >= 70 ? 'at-risk' : 'off-track';
              return (
                <div
                  key={kpi.id}
                  className={`p-4 border-l-4 rounded-lg ${STATUS_COLORS[liveStatus] || STATUS_COLORS['on-track']}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{kpi.name || 'Untitled'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[liveStatus] || STATUS_DOT['on-track']}`} />
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{kpi.category}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{kpi.actual}</span>
                    <span className="text-sm text-gray-400">/ {kpi.target} {kpi.unit}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className={`h-full rounded-full ${STATUS_DOT[liveStatus]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {kpi.trend && kpi.trend.length > 1 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">Trend ({kpi.trend.length} snapshots)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={32}>
                        <LineChart data={kpi.trend}>
                          <Line type="monotone" dataKey="value" stroke={liveStatus === 'on-track' ? '#10b981' : liveStatus === 'at-risk' ? '#f59e0b' : '#ef4444'} strokeWidth={1.5} dot={false} />
                          <ReTooltip
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 6px' }}
                            labelStyle={{ color: '#94a3b8' }}
                            itemStyle={{ color: '#f1f5f9' }}
                            formatter={(v) => [v, kpi.unit || 'value']}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <EditableTable
          data={kpis}
          columns={columns}
          onUpdate={handleKpiUpdate}
          createRow={() => ({
            id: generateId(),
            name: '',
            category: '',
            target: 0,
            actual: 0,
            unit: '',
            trend: [],
            status: 'on-track' as const,
          })}
        />
      </div>
    </div>
    </>
  );
}
