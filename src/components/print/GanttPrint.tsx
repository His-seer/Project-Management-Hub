'use client';

import type { GanttTask, ProjectMeta } from '@/types';

interface Props {
  tasks: GanttTask[];
  meta: ProjectMeta;
  timelineImage?: string | null;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#ec4899', '#84cc16', '#3b82f6', '#a855f7',
];

export function GanttPrint({ tasks, meta, timelineImage }: Props) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const validTasks = tasks.filter((t) => t.startDate && t.endDate);
  const completedTasks = tasks.filter((t) => t.progress >= 100);
  const inProgressTasks = tasks.filter((t) => t.progress > 0 && t.progress < 100);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  // ── Build timeline geometry ────────────────────────────────────────────────
  const allTs = validTasks.flatMap((t) => [
    new Date(t.startDate).getTime(),
    new Date(t.endDate).getTime(),
  ]);
  const minTs = allTs.length > 0 ? Math.min(...allTs) : Date.now();
  const maxTs = allTs.length > 0 ? Math.max(...allTs) : Date.now() + 86400000 * 30;
  const padding = Math.max((maxTs - minTs) * 0.03, 86400000 * 3);
  const startTs = minTs - padding;
  const endTs = maxTs + padding;
  const rangeMs = endTs - startTs;

  const chartTasks = validTasks.map((t, i) => {
    const s = new Date(t.startDate).getTime();
    const e = new Date(t.endDate).getTime();
    const leftPct = ((s - startTs) / rangeMs) * 100;
    const widthPct = Math.max(1, ((e - s) / rangeMs) * 100);
    return { ...t, leftPct, widthPct, color: COLORS[i % COLORS.length] };
  });

  // Month markers for timeline header
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

  const todayPct = ((Date.now() - startTs) / rangeMs) * 100;

  return (
    <div className="print-document" id="gantt-print" style={{ display: 'none' }}>

      {/* ── Document Header ───────────────────────────────────────────────── */}
      <div className="print-doc-header">
        <div>
          <div className="print-doc-title">{meta.name}</div>
          <div className="print-doc-subtitle">Gantt Chart &amp; Task Schedule</div>
        </div>
        <div className="print-doc-meta">
          Total Tasks: {tasks.length}<br />
          Completed: {completedTasks.length} | In Progress: {inProgressTasks.length}<br />
          Printed: {today}
        </div>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────── */}
      <div className="print-section-heading">1. Schedule Summary</div>
      <div className="print-grid-3" style={{ marginBottom: 16 }}>
        <div className="print-info-box">
          <div className="print-info-box-label">Total Tasks</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: '#1e3a5f' }}>
            {tasks.length}
          </div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">Completed</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: '#065f46' }}>
            {completedTasks.length}
          </div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">In Progress</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: '#92400e' }}>
            {inProgressTasks.length}
          </div>
        </div>
      </div>

      {(meta.startDate || meta.targetEndDate) && (
        <div style={{ marginBottom: 14, padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '9pt' }}>
          <strong>Project Start:</strong> {formatDate(meta.startDate ?? '')} &nbsp;|&nbsp;
          <strong>Target End:</strong> {formatDate(meta.targetEndDate ?? '')}
        </div>
      )}

      {/* ── Visual Gantt Chart ────────────────────────────────────────────── */}
      <div className="print-section-heading">2. Timeline</div>

      {chartTasks.length === 0 ? (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
          No tasks with dates recorded.
        </p>
      ) : timelineImage ? (
        /* ── Screenshot embed (exact match of what user sees on screen) ── */
        <div style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
          <img
            src={timelineImage}
            alt="Gantt Timeline"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
          {/* Month header row */}
          <div style={{ position: 'relative', height: 16, marginBottom: 4, marginLeft: 120 }}>
            {months.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${m.leftPct}%`,
                  fontSize: '7pt',
                  color: '#64748b',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Month grid lines + task bars */}
          <div style={{ position: 'relative', marginLeft: 120 }}>
            {/* Month grid lines */}
            {months.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${m.leftPct}%`,
                  borderLeft: '1px solid #e2e8f0',
                }}
              />
            ))}

            {/* Today line */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${todayPct}%`,
                  borderLeft: '2px solid #ef4444',
                  zIndex: 10,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: -14,
                  transform: 'translateX(-50%)',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '6pt',
                  padding: '1px 4px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                }}>
                  Today
                </div>
              </div>
            )}

            {/* Task bars */}
            {chartTasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 22,
                  marginBottom: 4,
                  position: 'relative',
                }}
              >
                {/* Task name label (pulled left of the chart area) */}
                <div style={{
                  position: 'absolute',
                  left: -120,
                  width: 115,
                  textAlign: 'right',
                  fontSize: '7.5pt',
                  color: '#334155',
                  paddingRight: 6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.name || `Task ${idx + 1}`}
                </div>

                {/* Bar track (background) */}
                <div style={{
                  position: 'relative',
                  flex: 1,
                  height: 18,
                }}>
                  <div style={{
                    position: 'absolute',
                    left: `${task.leftPct}%`,
                    width: `${task.widthPct}%`,
                    height: '100%',
                    background: '#dde1e7',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    {/* Progress fill */}
                    <div style={{
                      width: `${task.progress ?? 0}%`,
                      height: '100%',
                      background: task.color,
                      borderRadius: 3,
                    }} />
                    {/* Label on bar */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '6.5pt',
                      fontWeight: 700,
                      color: '#fff',
                    }}>
                      {task.progress > 0 ? `${task.progress}%` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, marginLeft: 120, fontSize: '7.5pt', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: '#6366f1', borderRadius: 2 }} />
              Progress filled
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, background: '#dde1e7', border: '1px solid #94a3b8', borderRadius: 2 }} />
              Remaining
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 2, height: 10, background: '#ef4444' }} />
              Today
            </span>
          </div>
        </div>
      )}

      {/* ── Detailed Task Table ───────────────────────────────────────────── */}
      <div className="print-section-heading print-break-before">3. Task Details</div>
      {tasks.length === 0 ? (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No tasks recorded.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ width: '30%' }}>Task Name</th>
              <th style={{ width: '14%' }}>Start Date</th>
              <th style={{ width: '14%' }}>End Date</th>
              <th style={{ width: '8%' }}>Progress</th>
              <th style={{ width: '14%' }}>Assignee</th>
              <th style={{ width: '16%' }}>Status Bar</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => (
              <tr key={task.id}>
                <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                <td><strong>{task.name || '—'}</strong></td>
                <td>{formatDate(task.startDate)}</td>
                <td>{formatDate(task.endDate)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{task.progress ?? 0}%</td>
                <td>{task.assignee || '—'}</td>
                <td>
                  <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        background: (task.progress ?? 0) >= 100 ? '#10b981' : (task.progress ?? 0) >= 50 ? '#f59e0b' : '#6366f1',
                        width: `${task.progress ?? 0}%`,
                        height: '100%',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="print-footer">
        <span>{meta.name} — Gantt Chart</span>
        <span>Confidential — For internal use only</span>
      </div>
    </div>
  );
}
