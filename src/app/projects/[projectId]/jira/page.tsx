'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useAtlassianStore } from '@/stores/useAtlassianStore';
import { useProjectStore } from '@/stores/useProjectStore';
import Link from 'next/link';
import { FolderKanban, RefreshCw, ExternalLink, Settings } from 'lucide-react';

interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee: string;
  priority: string;
  storyPoints: number | null;
  issueType: string;
}

interface SprintData {
  sprint: { id: number; name: string; startDate: string; endDate: string } | null;
  issues: JiraIssue[];
}

const STATUS_COLUMNS = [
  { key: 'new', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
  { key: 'indeterminate', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'done', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
];

export default function JiraHubPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const { baseUrl, email, apiToken, isConfigured } = useAtlassianStore();
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [boardIdInput, setBoardIdInput] = useState('');
  const [boardNameInput, setBoardNameInput] = useState('');

  const boardId = project?.meta.jiraBoardId;

  const fetchSprint = useCallback(async () => {
    if (!boardId || !isConfigured) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/jira/sprints?boardId=${boardId}`, {
        headers: { 'x-jira-base-url': baseUrl, 'x-jira-email': email, 'x-jira-token': apiToken },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [boardId, isConfigured, baseUrl, email, apiToken]);

  useEffect(() => { fetchSprint(); }, [fetchSprint]);

  if (!project) return null;

  if (!isConfigured) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FolderKanban size={24} /> Jira Hub
        </h1>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 max-w-lg">
          <p className="text-amber-800 dark:text-amber-300 mb-3">Connect your Atlassian account to enable Jira integration.</p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Settings size={16} /> Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  if (!boardId) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FolderKanban size={24} /> Jira Hub
        </h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Link a Jira board to this project to view sprints and issues.</p>
          <div className="space-y-3">
            <input type="text" value={boardIdInput} onChange={(e) => setBoardIdInput(e.target.value)} placeholder="Board ID (e.g., 42)" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <input type="text" value={boardNameInput} onChange={(e) => setBoardNameInput(e.target.value)} placeholder="Board name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            <button onClick={() => { if (boardIdInput) updateMeta(projectId, { jiraBoardId: boardIdInput, jiraBoardName: boardNameInput }); }} disabled={!boardIdInput} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Link Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  const grouped = STATUS_COLUMNS.map((col) => ({
    ...col,
    issues: data?.issues.filter((i) => i.statusCategory === col.key) || [],
  }));
  const totalPoints = data?.issues.reduce((s, i) => s + (i.storyPoints || 0), 0) || 0;
  const donePoints = data?.issues.filter((i) => i.statusCategory === 'done').reduce((s, i) => s + (i.storyPoints || 0), 0) || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FolderKanban size={24} /> Jira Hub</h1>
          {data?.sprint && <p className="text-gray-500 dark:text-gray-400 mt-1">{data.sprint.name} — {data.issues.length} issues, {donePoints}/{totalPoints} pts</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSprint} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <a href={`${baseUrl}/jira/software/projects/board/${boardId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700">
            <ExternalLink size={14} /> Open in Jira
          </a>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}

      {data?.sprint && totalPoints > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1"><span>Sprint Progress</span><span>{Math.round((donePoints / totalPoints) * 100)}%</span></div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="h-2.5 rounded-full bg-green-500 transition-all" style={{ width: `${(donePoints / totalPoints) * 100}%` }} /></div>
        </div>
      )}

      {!data?.sprint && !loading && !error && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">No active sprint found for this board.</p>
        </div>
      )}

      {data?.sprint && (
        <div className="grid grid-cols-3 gap-4">
          {grouped.map((col) => (
            <div key={col.key} className={`rounded-xl p-3 ${col.color} min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</h3>
                <span className="text-xs text-gray-500 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">{col.issues.length}</span>
              </div>
              <div className="space-y-2">
                {col.issues.map((issue) => (
                  <div key={issue.key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{issue.key}</span>
                      {issue.storyPoints !== null && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{issue.storyPoints} pts</span>}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">{issue.summary}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500"><span>{issue.assignee}</span><span className="capitalize">{issue.priority}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="text-center py-12"><RefreshCw size={24} className="animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Loading sprint data...</p></div>}
    </div>
  );
}
