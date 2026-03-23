'use client';

import { useState } from 'react';
import { useProjectId } from '@/hooks/useCurrentProject';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import { Workflow, Plus, Trash2, Play, Pause, ArrowLeft } from 'lucide-react';

export default function WorkflowsPage() {
  const projectId = useProjectId();
  const workflows = useWorkflowStore((s) => s.getProjectWorkflows(projectId));
  const activeId = useWorkflowStore((s) => s.activeWorkflowId);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const setActive = useWorkflowStore((s) => s.setActiveWorkflow);
  const updateWorkflow = useWorkflowStore((s) => s.updateWorkflow);

  const [newName, setNewName] = useState('');

  const activeWorkflow = activeId ? workflows.find((w) => w.id === activeId) : null;

  const handleCreate = () => {
    const name = newName.trim() || `Workflow ${workflows.length + 1}`;
    createWorkflow(projectId, name);
    setNewName('');
  };

  // Canvas view
  if (activeWorkflow) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActive(null)}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{activeWorkflow.name}</h2>
              <p className="text-[10px] text-slate-500">{activeWorkflow.nodes.length} nodes · {activeWorkflow.edges.length} connections</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateWorkflow(activeWorkflow.id, { enabled: !activeWorkflow.enabled })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeWorkflow.enabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {activeWorkflow.enabled ? <Pause size={12} /> : <Play size={12} />}
              {activeWorkflow.enabled ? 'Active' : 'Paused'}
            </button>
          </div>
        </div>
        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas workflowId={activeWorkflow.id} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="pm-page-header">
        <h1 className="pm-page-title flex items-center gap-2">
          <Workflow size={20} className="text-indigo-500" />
          Automation Workflows
        </h1>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Build visual automations that trigger AI agents, update project data, and send notifications based on project events.
      </p>

      {/* Create */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Workflow name..."
          className="field-input flex-1 max-w-xs"
        />
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={15} />
          New Workflow
        </button>
      </div>

      {/* List */}
      {workflows.length === 0 ? (
        <div className="pm-card p-8 text-center">
          <Workflow size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500">No workflows yet. Create one to get started.</p>
          <p className="text-xs text-slate-400 mt-1">Drag triggers, actions, and AI agents onto a visual canvas to build automations.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="pm-card p-4 flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors"
              onClick={() => setActive(wf.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${wf.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">{wf.name}</h3>
                  <p className="text-xs text-slate-500">
                    {wf.nodes.length} nodes · {wf.edges.length} connections
                    {wf.description && ` · ${wf.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  wf.enabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {wf.enabled ? 'Active' : 'Paused'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
