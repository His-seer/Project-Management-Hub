'use client';

import { useState } from 'react';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAiStore } from '@/stores/useAiStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { LessonLearned } from '@/types';
import { generateId } from '@/lib/ids';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import { Lightbulb, Sparkles } from 'lucide-react';

const columns: Column<LessonLearned>[] = [
  { key: 'phase', label: 'Phase', width: '12%' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'process', label: 'Process' },
      { value: 'technical', label: 'Technical' },
      { value: 'people', label: 'People' },
      { value: 'tools', label: 'Tools' },
      { value: 'communication', label: 'Communication' },
    ],
    width: '12%',
  },
  { key: 'whatWorked', label: 'What Worked', width: '20%' },
  { key: 'whatDidnt', label: "What Didn't Work", width: '20%' },
  { key: 'recommendation', label: 'Recommendation', width: '20%' },
  { key: 'date', label: 'Date', type: 'date', width: '12%' },
];

export default function LessonsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const ai = useAiStore();
  const selectedModel = ai.model;
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!project) return null;

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await apiFetch('/api/ai/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, model: selectedModel }),
      });
      const raw = await readSseStream(res);
      const generated = parseAiJson<Omit<LessonLearned, 'id'>[]>(raw);
      const today = new Date().toISOString().split('T')[0];
      const withIds: LessonLearned[] = generated.map((l) => ({
        ...l,
        id: generateId(),
        date: today,
      }));
      updateModule(projectId, 'lessons', [...project.lessons, ...withIds]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="pm-page-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Lightbulb size={24} />
          Lessons Learned
        </h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate lessons from closed risks, resolved issues, missed milestones, and change requests"
          >
            <Sparkles size={15} />
            {aiGenerating ? 'Analysing…' : 'AI Generate from Project Data'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {aiError}
        </div>
      )}

      {aiGenerating && (
        <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
          Analysing closed risks, resolved issues, missed milestones, and change requests…
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        AI generates lessons from project evidence (closed risks, resolved issues, missed milestones). You can also add manual entries below.
      </p>

      <EditableTable
        data={project.lessons}
        columns={columns}
        onUpdate={(data) => updateModule(projectId, 'lessons', data)}
        createRow={() => ({
          id: generateId(),
          phase: '',
          category: 'process' as const,
          whatWorked: '',
          whatDidnt: '',
          recommendation: '',
          date: new Date().toISOString().split('T')[0],
        })}
      />
    </div>
  );
}
