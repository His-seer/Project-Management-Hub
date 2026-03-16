'use client';

import { useState } from 'react';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import { EditableTable, type Column } from '@/components/shared/EditableTable';
import type { Stakeholder } from '@/types';
import { generateId } from '@/lib/ids';
import { UserCheck, Sparkles, X } from 'lucide-react';

const columns: Column<Stakeholder>[] = [
  { key: 'name', label: 'Name', width: '13%' },
  { key: 'role', label: 'Role', width: '10%' },
  { key: 'organization', label: 'Organization', width: '12%' },
  {
    key: 'power',
    label: 'Power',
    type: 'select',
    options: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) })),
    width: '7%',
  },
  {
    key: 'interest',
    label: 'Interest',
    type: 'select',
    options: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) })),
    width: '7%',
  },
  {
    key: 'engagement',
    label: 'Engagement',
    type: 'select',
    options: [
      { value: 'unaware', label: 'Unaware' },
      { value: 'resistant', label: 'Resistant' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'supportive', label: 'Supportive' },
      { value: 'leading', label: 'Leading' },
    ],
    width: '11%',
  },
  { key: 'communicationPreference', label: 'Comm. Pref.', width: '12%' },
  { key: 'contactInfo', label: 'Contact', width: '14%' },
];

interface AIRecommendation {
  stakeholderName: string;
  quadrant: string;
  recommendedEngagement: string;
  suggestedActions: string[];
  communicationFrequency: string;
}

export default function StakeholdersPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[] | null>(null);
  const [aiError, setAiError] = useState<string>('');

  if (!project) return null;

  const stakeholders = project.stakeholders;

  const handleUpdate = (data: Stakeholder[]) => {
    const updated = data.map((s) => ({
      ...s,
      power: Number(s.power) as 1 | 2 | 3 | 4 | 5,
      interest: Number(s.interest) as 1 | 2 | 3 | 4 | 5,
    }));
    updateModule(projectId, 'stakeholders', updated);
  };

  const generateEngagementPlan = async () => {
    setAiGenerating(true);
    setAiError('');
    setAiRecommendations(null);
    try {
      let raw = '';
      const res = await fetch('/api/ai/stakeholder-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholders: project.stakeholders,
          projectName: project.meta.name,
          projectDescription: project.meta.description,
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) raw += parsed.text;
        }
      }
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        setAiRecommendations(JSON.parse(match[0]));
      } else {
        throw new Error('Could not parse AI response');
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate engagement plan');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyRecommendation = (rec: AIRecommendation) => {
    const updated = stakeholders.map((s) => {
      if (s.name === rec.stakeholderName) {
        return {
          ...s,
          engagement: rec.recommendedEngagement as Stakeholder['engagement'],
          communicationPreference: rec.communicationFrequency,
        };
      }
      return s;
    });
    updateModule(projectId, 'stakeholders', updated);
  };

  // Power/Interest grid
  const quadrants = {
    'high-high': stakeholders.filter((s) => s.power >= 3 && s.interest >= 3),
    'high-low': stakeholders.filter((s) => s.power >= 3 && s.interest < 3),
    'low-high': stakeholders.filter((s) => s.power < 3 && s.interest >= 3),
    'low-low': stakeholders.filter((s) => s.power < 3 && s.interest < 3),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCheck size={24} />
          Stakeholder Register
        </h1>
        <button
          onClick={generateEngagementPlan}
          disabled={aiGenerating || stakeholders.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50"
        >
          <Sparkles size={14} />
          {aiGenerating ? 'Generating...' : 'AI Engagement Plan'}
        </button>
      </div>

      {/* Power/Interest Grid */}
      {stakeholders.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Power / Interest Grid</h2>
          <div className="grid grid-cols-2 gap-1 max-w-lg">
            <QuadrantCell label="Manage Closely" items={quadrants['high-high']} color="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" />
            <QuadrantCell label="Keep Satisfied" items={quadrants['high-low']} color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" />
            <QuadrantCell label="Keep Informed" items={quadrants['low-high']} color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" />
            <QuadrantCell label="Monitor" items={quadrants['low-low']} color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" />
          </div>
          <div className="flex justify-between max-w-lg mt-1 text-[10px] text-gray-400">
            <span>Low Interest</span>
            <span>High Interest</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0">High Power (top) / Low Power (bottom)</div>
        </div>
      )}

      {/* AI Recommendations Panel */}
      {aiError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {aiError}
        </div>
      )}
      {aiRecommendations && (
        <div className="mb-6 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Sparkles size={14} />
              AI Engagement Recommendations
            </h2>
            <button
              onClick={() => setAiRecommendations(null)}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
            >
              <X size={12} /> Dismiss All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiRecommendations.map((rec, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rec.stakeholderName}</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">{rec.quadrant}</span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Engagement:</span> {rec.recommendedEngagement}</p>
                  <p><span className="font-medium">Frequency:</span> {rec.communicationFrequency}</p>
                  <div>
                    <span className="font-medium">Actions:</span>
                    <ul className="list-disc list-inside ml-1 mt-0.5">
                      {rec.suggestedActions.map((a, j) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => applyRecommendation(rec)}
                  className="mt-3 w-full text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg py-1.5"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditableTable
        data={stakeholders}
        columns={columns}
        onUpdate={handleUpdate}
        exportFilename="stakeholders"
        createRow={() => ({
          id: generateId(),
          name: '',
          role: '',
          organization: '',
          power: 3 as const,
          interest: 3 as const,
          engagement: 'neutral' as const,
          communicationPreference: '',
          contactInfo: '',
        })}
      />
    </div>
  );
}

function QuadrantCell({ label, items, color }: { label: string; items: Stakeholder[]; color: string }) {
  return (
    <div className={`p-3 rounded border ${color} min-h-[80px]`}>
      <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</div>
      <div className="space-y-0.5">
        {items.map((s) => (
          <div key={s.id} className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.name || 'Unnamed'}</div>
        ))}
        {items.length === 0 && <div className="text-xs text-gray-400">-</div>}
      </div>
    </div>
  );
}
