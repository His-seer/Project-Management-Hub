'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { GanttTask } from '@/types';
import { generateId } from '@/lib/ids';
import { GanttChart, CalendarDays, Printer } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { GanttPrint } from '@/components/print/GanttPrint';
import { downloadAsPdf } from '@/lib/printExport';

const PHASE_COLORS = [
  { bg: 'bg-indigo-500', light: 'bg-indigo-200 dark:bg-indigo-900/50' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-200 dark:bg-emerald-900/50' },
  { bg: 'bg-amber-500', light: 'bg-amber-200 dark:bg-amber-900/50' },
  { bg: 'bg-rose-500', light: 'bg-rose-200 dark:bg-rose-900/50' },
  { bg: 'bg-violet-500', light: 'bg-violet-200 dark:bg-violet-900/50' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-200 dark:bg-cyan-900/50' },
];

const columns: Column<GanttTask>[] = [
  { key: 'name', label: 'Task', width: '25%' },
  { key: 'startDate', label: 'Start', type: 'date', width: '13%' },
  { key: 'endDate', label: 'End', type: 'date', width: '13%' },
  { key: 'progress', label: '%', type: 'number', width: '8%' },
  { key: 'assignee', label: 'Assignee', width: '15%' },
];

export default function GanttPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineImage, setTimelineImage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  if (!project) return null;

  const tasks = project.gantt.tasks;

  const handleUpdate = (updated: GanttTask[]) => {
    const clamped = updated.map((t) => ({
      ...t,
      progress: Math.min(100, Math.max(0, Number(t.progress) || 0)),
    }));
    updateModule(projectId, 'gantt', { tasks: clamped });
  };

  const createTask = (): GanttTask => ({
    id: generateId(),
    name: 'New Task',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    progress: 0,
    assignee: '',
    dependencies: [],
  });

  const { minTs, rangeMs, chartTasks, months, todayPct } = useMemo(() => {
    const validTasks = tasks.filter((t) => t.startDate && t.endDate);
    if (validTasks.length === 0) return { minTs: 0, rangeMs: 0, chartTasks: [], months: [], todayPct: -1 };

    const allTs = validTasks.flatMap((t) => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]);
    const minTs = Math.min(...allTs);
    const maxTs = Math.max(...allTs);
    // Add 5% padding
    const padding = Math.max((maxTs - minTs) * 0.02, 86400000 * 2);
    const startTs = minTs - padding;
    const endTs = maxTs + padding;
    const rangeMs = endTs - startTs;

    const chartTasks = validTasks.map((t, i) => {
      const s = new Date(t.startDate).getTime();
      const e = new Date(t.endDate).getTime();
      const leftPct = ((s - startTs) / rangeMs) * 100;
      const widthPct = Math.max(0.5, ((e - s) / rangeMs) * 100);
      const color = PHASE_COLORS[i % PHASE_COLORS.length];
      return { ...t, leftPct, widthPct, color };
    });

    // Generate month markers
    const months: { label: string; leftPct: number }[] = [];
    const cursor = new Date(startTs);
    cursor.setDate(1);
    while (cursor.getTime() <= endTs) {
      const pct = ((cursor.getTime() - startTs) / rangeMs) * 100;
      if (pct >= 0 && pct <= 100) {
        months.push({
          label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          leftPct: pct,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const nowTs = Date.now();
    const todayPct = ((nowTs - startTs) / rangeMs) * 100;

    return { minTs: startTs, rangeMs, chartTasks, months, todayPct };
  }, [tasks]);

  const validCount = tasks.filter((t) => t.startDate && t.endDate).length;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // Capture timeline chart as image first
      const html2canvas = (await import('html2canvas')).default;
      if (timelineRef.current && chartTasks.length > 0) {
        const canvas = await html2canvas(timelineRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        });
        setTimelineImage(canvas.toDataURL('image/png'));
      }
      // Wait two frames for React to mount the image into GanttPrint, then download
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          await downloadAsPdf('gantt-print', `${project!.meta.name} — Gantt Chart`);
          setTimelineImage(null);
          setExporting(false);
        });
      });
    } catch (err) {
      console.error('Gantt export failed:', err);
      await downloadAsPdf('gantt-print', `${project!.meta.name} — Gantt Chart`);
      setExporting(false);
    }
  };

  return (
    <>
    <GanttPrint tasks={tasks} meta={project.meta} timelineImage={timelineImage} />
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <div>
          <h1 className="pm-page-title flex items-center gap-2">
            <GanttChart size={20} className="text-indigo-500" />
            Gantt Chart
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{tasks.length} tasks · {validCount} with dates</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="btn-secondary print-hide disabled:opacity-50"
        >
          <Printer size={16} />
          {exporting ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>

      {/* Timeline visualization */}
      {chartTasks.length > 0 && (
        <div ref={timelineRef} className="pm-card p-5 mb-6 overflow-x-auto" style={{ background: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">
            <CalendarDays size={16} className="text-indigo-500" />
            Timeline
          </div>

          {/* Month headers */}
          <div className="relative h-5 mb-1" style={{ minWidth: 600 }}>
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute text-[10px] text-slate-400"
                style={{ left: `${m.leftPct}%`, transform: 'translateX(-50%)' }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid + bars */}
          <div className="relative" style={{ minWidth: 600 }}>
            {/* Month grid lines */}
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-slate-100 dark:border-slate-800"
                style={{ left: `${m.leftPct}%` }}
              />
            ))}
            {/* Today line */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10"
                style={{ left: `${todayPct}%` }}
              >
                <div className="absolute -top-1 -translate-x-1/2 bg-red-400 text-white text-[9px] px-1 rounded whitespace-nowrap">
                  Today
                </div>
              </div>
            )}
            {/* Task bars */}
            <div className="space-y-2">
              {chartTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-slate-600 dark:text-slate-400 truncate flex-shrink-0 text-right pr-2">
                    {task.name || 'Untitled'}
                  </div>
                  <div className="flex-1 relative h-8">
                    {/* Background track */}
                    <div className={`absolute top-1 h-6 rounded-md ${task.color.light}`} style={{ left: `${task.leftPct}%`, width: `${task.widthPct}%` }}>
                      {/* Progress fill */}
                      <div
                        className={`h-full rounded-md ${task.color.bg} opacity-80 transition-all`}
                        style={{ width: `${task.progress}%` }}
                      />
                      {/* Label */}
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white mix-blend-difference">
                        {task.progress > 0 ? `${task.progress}%` : task.name.substring(0, 12)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-[10px] text-slate-400 flex-shrink-0">
                    {task.assignee ? task.assignee.split(' ')[0] : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <div className="w-3 h-3 rounded bg-indigo-500 opacity-80" /> Progress filled
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <div className="w-3 h-3 rounded bg-indigo-200" /> Remaining
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <div className="w-0.5 h-3 bg-red-400" /> Today
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="pm-card p-5">
        <EditableTable
          data={tasks}
          columns={columns}
          onUpdate={handleUpdate}
          createRow={createTask}
          emptyMessage="No tasks yet. Click 'Add Row' to add your first task."
        />
      </div>
    </div>
    </>
  );
}
