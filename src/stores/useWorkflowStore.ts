'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';
import type { Workflow, SerializedNode, SerializedEdge } from '@/types/workflow';
import { generateId } from '@/lib/ids';

interface WorkflowStore {
  workflows: Record<string, Workflow>;
  activeWorkflowId: string | null;
  createWorkflow: (projectId: string, name: string, description?: string) => string;
  updateWorkflow: (id: string, updates: Partial<Omit<Workflow, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteWorkflow: (id: string) => void;
  setActiveWorkflow: (id: string | null) => void;
  getProjectWorkflows: (projectId: string) => Workflow[];
  updateNodes: (workflowId: string, nodes: SerializedNode[]) => void;
  updateEdges: (workflowId: string, edges: SerializedEdge[]) => void;
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: {},
      activeWorkflowId: null,

      createWorkflow: (projectId, name, description = '') => {
        const id = generateId();
        const now = new Date().toISOString();
        const workflow: Workflow = {
          id, name, description, projectId,
          enabled: false,
          nodes: [],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ workflows: { ...s.workflows, [id]: workflow }, activeWorkflowId: id }));
        return id;
      },

      updateWorkflow: (id, updates) => {
        set((s) => {
          const wf = s.workflows[id];
          if (!wf) return s;
          return { workflows: { ...s.workflows, [id]: { ...wf, ...updates, updatedAt: new Date().toISOString() } } };
        });
      },

      deleteWorkflow: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.workflows;
          return { workflows: rest, activeWorkflowId: s.activeWorkflowId === id ? null : s.activeWorkflowId };
        });
      },

      setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

      getProjectWorkflows: (projectId) => {
        return Object.values(get().workflows).filter((w) => w.projectId === projectId);
      },

      updateNodes: (workflowId, nodes) => {
        set((s) => {
          const wf = s.workflows[workflowId];
          if (!wf) return s;
          return { workflows: { ...s.workflows, [workflowId]: { ...wf, nodes, updatedAt: new Date().toISOString() } } };
        });
      },

      updateEdges: (workflowId, edges) => {
        set((s) => {
          const wf = s.workflows[workflowId];
          if (!wf) return s;
          return { workflows: { ...s.workflows, [workflowId]: { ...wf, edges, updatedAt: new Date().toISOString() } } };
        });
      },
    }),
    {
      name: 'pm-app-workflows',
      storage: safeStorage,
    }
  )
);
