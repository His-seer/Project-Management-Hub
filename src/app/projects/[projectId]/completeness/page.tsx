'use client';

import Link from 'next/link';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { calculateCompleteness, overallCompleteness } from '@/lib/completeness';
import { CheckCircle2, Circle } from 'lucide-react';

export default function CompletenessPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();

  if (!project) return null;

  const items = calculateCompleteness(project);
  const pct = overallCompleteness(project);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <CheckCircle2 size={24} />
        Completeness Tracker
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Track which PM artifacts are complete for this project.
      </p>

      {/* Overall progress */}
      <div className="mb-8 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.module}
            href={`/projects/${projectId}/${item.module}`}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3">
              {item.complete ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <Circle size={20} className="text-gray-300 dark:text-gray-600" />
              )}
              <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    item.percentage >= 80 ? 'bg-green-500' : item.percentage >= 50 ? 'bg-amber-500' : item.percentage > 0 ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-10 text-right">{item.percentage}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
