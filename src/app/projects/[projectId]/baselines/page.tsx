'use client';

import { useState } from 'react';
import { useCurrentProject } from '@/hooks/useCurrentProject';
import { Bookmark } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function BaselinesPage() {
  const project = useCurrentProject();
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!project) return null;

  const baselines = project.baselines ?? [];

  if (baselines.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <Bookmark size={24} />
          Baseline Comparison
        </h1>
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Bookmark size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No baselines yet. Use the &quot;Take Baseline&quot; button on the Dashboard to capture a snapshot.</p>
        </div>
      </div>
    );
  }

  const baseline = baselines[selectedIdx];
  const currentMilestones = project.plan.milestones;
  const currentBudget = project.plan.budget;
  const currentKpis = project.kpis;

  // Milestone variance
  const milestoneRows = baseline.milestones.map((bm) => {
    const current = currentMilestones.find((m) => m.name === bm.name);
    const delta = current && bm.dueDate && current.dueDate
      ? daysBetween(bm.dueDate, current.dueDate)
      : null;
    return {
      name: bm.name,
      baselineDate: bm.dueDate,
      currentDate: current?.dueDate ?? '—',
      currentStatus: current?.status ?? '—',
      delta,
    };
  });

  // Budget variance
  const budgetRows = baseline.budget.map((bb) => {
    const current = currentBudget.find((b) => b.category === bb.category);
    return {
      category: bb.category,
      baselinePlanned: bb.planned,
      currentPlanned: current?.planned ?? 0,
      currentActual: current?.actual ?? 0,
      variancePlanned: (current?.planned ?? 0) - bb.planned,
      varianceActual: (current?.actual ?? 0) - bb.planned,
    };
  });

  // Budget chart data
  const budgetChartData = budgetRows.map((r) => ({
    name: r.category.length > 14 ? r.category.slice(0, 14) + '…' : r.category,
    baseline: r.baselinePlanned,
    current: r.currentPlanned,
    actual: r.currentActual,
  }));

  // KPI comparison
  const kpiRows = baseline.kpis.map((bk) => {
    const current = currentKpis.find((k) => k.name === bk.name);
    return {
      name: bk.name,
      unit: bk.unit,
      baselineTarget: bk.target,
      baselineActual: bk.actual,
      currentTarget: current?.target ?? 0,
      currentActual: current?.actual ?? 0,
      delta: (current?.actual ?? 0) - bk.actual,
    };
  });

  const deltaColor = (v: number, invert = false) => {
    if (v === 0) return 'text-gray-500';
    const positive = invert ? v < 0 : v > 0;
    return positive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="pm-page-header mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bookmark size={24} />
          Baseline Comparison
        </h1>
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          {baselines.map((b, i) => (
            <option key={b.id} value={i}>
              {b.name} ({new Date(b.createdAt).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Captured: {new Date(baseline.createdAt).toLocaleString()} — comparing against current project state.
      </p>

      {/* Milestone Variance */}
      <div className="pm-card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Milestone Variance</h2>
        {milestoneRows.length === 0 ? (
          <p className="text-sm text-gray-400">No milestones in this baseline.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4">Milestone</th>
                  <th className="pb-2 pr-4">Baseline Date</th>
                  <th className="pb-2 pr-4">Current Date</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Delta (days)</th>
                </tr>
              </thead>
              <tbody>
                {milestoneRows.map((r) => (
                  <tr key={r.name} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.name}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.baselineDate}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.currentDate}</td>
                    <td className="py-2 pr-4 capitalize text-gray-600 dark:text-gray-400">{r.currentStatus}</td>
                    <td className={`py-2 font-semibold tabular-nums ${r.delta !== null ? deltaColor(r.delta) : 'text-gray-400'}`}>
                      {r.delta !== null ? (r.delta > 0 ? `+${r.delta}d` : r.delta === 0 ? '0d' : `${r.delta}d`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Budget Variance */}
      <div className="pm-card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Budget Variance</h2>
        {budgetRows.length === 0 ? (
          <p className="text-sm text-gray-400">No budget items in this baseline.</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4 text-right">Baseline Plan</th>
                    <th className="pb-2 pr-4 text-right">Current Plan</th>
                    <th className="pb-2 pr-4 text-right">Current Actual</th>
                    <th className="pb-2 text-right">Variance (Plan)</th>
                    <th className="pb-2 text-right">Variance (Actual)</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((r) => (
                    <tr key={r.category} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.category}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">${r.baselinePlanned.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">${r.currentPlanned.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">${r.currentActual.toLocaleString()}</td>
                      <td className={`py-2 pr-4 text-right tabular-nums font-semibold ${deltaColor(r.variancePlanned)}`}>
                        {r.variancePlanned > 0 ? '+' : ''}{r.variancePlanned !== 0 ? `$${r.variancePlanned.toLocaleString()}` : '—'}
                      </td>
                      <td className={`py-2 text-right tabular-nums font-semibold ${deltaColor(r.varianceActual)}`}>
                        {r.varianceActual > 0 ? '+' : ''}{r.varianceActual !== 0 ? `$${r.varianceActual.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {budgetChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetChartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [`$${Number(v).toLocaleString()}`, '']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="baseline" name="Baseline Plan" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" name="Current Plan" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>

      {/* KPI Comparison */}
      <div className="pm-card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">KPI Comparison</h2>
        {kpiRows.length === 0 ? (
          <p className="text-sm text-gray-400">No KPIs in this baseline.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4">KPI</th>
                  <th className="pb-2 pr-4 text-right">Baseline Actual</th>
                  <th className="pb-2 pr-4 text-right">Current Actual</th>
                  <th className="pb-2 pr-4 text-right">Target</th>
                  <th className="pb-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((r) => (
                  <tr key={r.name} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">{r.baselineActual} {r.unit}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">{r.currentActual} {r.unit}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-400">{r.currentTarget} {r.unit}</td>
                    <td className={`py-2 text-right tabular-nums font-semibold ${r.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : r.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                      {r.delta > 0 ? '+' : ''}{r.delta} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
