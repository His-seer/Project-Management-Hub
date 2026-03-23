'use client';

import { create } from 'zustand';
import type { Project, ProjectMeta, AuditEntry } from '@/types';
import { createDefaultProject } from '@/lib/defaults';
import { generateId } from '@/lib/ids';
import apiFetch from '@/lib/apiFetch';

const MODULE_LABELS: Partial<Record<keyof Project, string>> = {
  charter: 'Charter', plan: 'Project Plan', gantt: 'Gantt', wbs: 'WBS',
  raci: 'RACI Matrix', risks: 'Risk Register', issues: 'Issue Tracker',
  changes: 'Change Management', resources: 'Resources', estimates: 'Estimates',
  kpis: 'KPIs', roadmap: 'Roadmap', governance: 'Governance', funding: 'Funding',
  stakeholders: 'Stakeholders', communications: 'Communication Plan',
  meetings: 'Meetings', lessons: 'Lessons Learned', decisions: 'Decisions',
  assumptions: 'Assumptions', statusReports: 'Status Reports', actionItems: 'Action Items',
};

// Efficient per-module sync via PATCH
async function syncModuleToDb(id: string, module: string, data: unknown) {
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, data }),
    });
  } catch (e) {
    console.error('DB module sync failed:', e);
  }
}

// Sync meta fields only
async function syncMetaToDb(id: string, meta: ProjectMeta) {
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'meta', data: meta }),
    });
  } catch (e) {
    console.error('DB meta sync failed:', e);
  }
}

async function deleteProjectFromDb(id: string) {
  try {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.error('DB delete failed:', e);
  }
}

interface ProjectStore {
  projects: Record<string, Project>;
  hydrated: boolean;
  loadFromDb: () => Promise<void>;
  addProject: (name: string, description: string, startDate: string, targetEndDate: string) => string;
  updateMeta: (id: string, meta: Partial<ProjectMeta>) => void;
  updateModule: <K extends keyof Project>(id: string, module: K, data: Project[K]) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  importProjects: (data: Record<string, Project>) => void;
  mergeProjects: (data: Record<string, Project>) => void;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  projects: {},
  hydrated: false,

  loadFromDb: async () => {
    try {
      const res = await apiFetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load');
      const projects = await res.json() as Record<string, Project>;
      set({ projects, hydrated: true });
    } catch (e) {
      console.error('Failed to load projects from DB:', e);
      set({ hydrated: true });
    }
  },

  addProject: (name, description, startDate, targetEndDate) => {
    const id = generateId();
    const now = new Date().toISOString();
    const meta: ProjectMeta = {
      id, name, description, status: 'active', health: 'green',
      startDate, targetEndDate, createdAt: now, updatedAt: now,
    };
    const project = createDefaultProject(meta);
    set((state) => ({ projects: { ...state.projects, [id]: project } }));
    // POST full project to create all rows
    apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data: project }),
    }).catch(console.error);
    return id;
  },

  updateMeta: (id, partial) => {
    set((state) => {
      const project = state.projects[id];
      if (!project) return state;
      const now = new Date().toISOString();
      const changedFields = Object.keys(partial).filter((k) => k !== 'updatedAt');
      const entry: AuditEntry = {
        id: generateId(), timestamp: now, module: 'meta',
        summary: `Updated project settings: ${changedFields.join(', ')}`,
      };
      const newAuditLog = [...(project.auditLog ?? []), entry].slice(-500);
      const newMeta = { ...project.meta, ...partial, updatedAt: now };
      const updated = { ...project, auditLog: newAuditLog, meta: newMeta };
      // Sync meta + audit in parallel
      syncMetaToDb(id, newMeta);
      syncModuleToDb(id, 'auditLog', newAuditLog);
      return { projects: { ...state.projects, [id]: updated } };
    });
  },

  updateModule: (id, module, data) => {
    set((state) => {
      const project = state.projects[id];
      if (!project) return state;
      const now = new Date().toISOString();
      const newAuditLog = module === 'auditLog' ? (project.auditLog ?? []) : (() => {
        const label = MODULE_LABELS[module as keyof Project] ?? String(module);
        const entry: AuditEntry = {
          id: generateId(), timestamp: now, module: String(module),
          summary: `Updated ${label}`,
        };
        return [...(project.auditLog ?? []), entry].slice(-500);
      })();
      const updated = {
        ...project,
        [module]: data,
        auditLog: newAuditLog,
        meta: { ...project.meta, updatedAt: now },
      };
      // Sync only the changed module + audit
      syncModuleToDb(id, String(module), data);
      if (module !== 'auditLog') {
        syncModuleToDb(id, 'auditLog', newAuditLog);
      }
      return { projects: { ...state.projects, [id]: updated } };
    });
  },

  deleteProject: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.projects;
      deleteProjectFromDb(id);
      return { projects: rest };
    });
  },

  getProject: (id) => get().projects[id],

  importProjects: (data) => {
    set({ projects: data });
    // Full save for imported projects
    Object.entries(data).forEach(([id, project]) => {
      apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data: project }),
      }).catch(console.error);
    });
  },

  mergeProjects: (data) => {
    set((state) => {
      const merged = { ...state.projects, ...data };
      Object.entries(data).forEach(([id, project]) => {
        apiFetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, data: project }),
        }).catch(console.error);
      });
      return { projects: merged };
    });
  },
}));
