'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { History, Trash2 } from 'lucide-react';

const MODULE_COLORS: Record<string, string> = {
  meta: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  risks: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  issues: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  plan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  kpis: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  changes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  actionItems: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  funding: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function HistoryPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const log = [...(project.auditLog ?? [])].reverse(); // newest first

  const clearHistory = () => {
    updateModule(projectId, 'auditLog', []);
  };

  // Group entries by date
  const groups: { date: string; entries: typeof log }[] = [];
  log.forEach((entry) => {
    const { date } = formatTimestamp(entry.timestamp);
    const existing = groups.find((g) => g.date === date);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.push({ date, entries: [entry] });
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="pm-page-header mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History size={24} />
          Change History
        </h1>
        {log.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Clear History
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        All module updates are automatically recorded. Last {log.length} entries shown (max 500).
      </p>

      {log.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <History size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No history yet. Changes will appear here as you update the project.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2">{group.date}</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="space-y-1.5">
                {group.entries.map((entry) => {
                  const { time } = formatTimestamp(entry.timestamp);
                  const moduleColor = MODULE_COLORS[entry.module] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg"
                    >
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-12 shrink-0">{time}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${moduleColor}`}>
                        {entry.module}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{entry.summary}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
