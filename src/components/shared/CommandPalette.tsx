'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import { useUiStore } from '@/stores/useUiStore';
import {
  Search, LayoutDashboard, Plus, GraduationCap, Settings, FileText,
  AlertTriangle, Users, BarChart3, MessageSquare, FolderKanban,
  Moon, Sun, Workflow, Sparkles,
} from 'lucide-react';

type CmdItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  section: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const projects = useProjectStore((s) => s.projects);
  const { theme, toggleTheme, toggleChat } = useUiStore();

  // Extract current project id
  const parts = pathname.split('/');
  const projIdx = parts.indexOf('projects');
  const currentProjectId = projIdx >= 0 ? parts[projIdx + 1] : null;
  const isProjectPage = currentProjectId && currentProjectId !== 'new';

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = useCallback((path: string) => { router.push(path); setOpen(false); }, [router]);

  const items = useMemo<CmdItem[]>(() => {
    const list: CmdItem[] = [];

    // Navigation
    list.push({ id: 'nav-dashboard', label: 'Portfolio Dashboard', icon: <LayoutDashboard size={16} />, action: () => go('/'), section: 'Navigation' });
    list.push({ id: 'nav-new', label: 'Create New Project', icon: <Plus size={16} />, action: () => go('/projects/new'), section: 'Navigation' });
    list.push({ id: 'nav-learn', label: 'Learning Hub', icon: <GraduationCap size={16} />, action: () => go('/learn'), section: 'Navigation' });
    list.push({ id: 'nav-quiz', label: 'Practice Quizzes', icon: <Sparkles size={16} />, action: () => go('/learn/quiz'), section: 'Navigation' });
    list.push({ id: 'nav-settings', label: 'Settings', icon: <Settings size={16} />, action: () => go('/settings'), section: 'Navigation' });

    // Projects
    Object.values(projects).forEach((p) => {
      const pid = p.meta.id;
      list.push({ id: `proj-${pid}`, label: p.meta.name, sublabel: p.meta.status, icon: <FolderKanban size={16} />, action: () => go(`/projects/${pid}`), section: 'Projects' });
    });

    // Project-specific actions
    if (isProjectPage && currentProjectId) {
      const base = `/projects/${currentProjectId}`;
      list.push({ id: 'pm-charter', label: 'Charter', sublabel: 'View project charter', icon: <FileText size={16} />, action: () => go(`${base}/charter`), section: 'Current Project' });
      list.push({ id: 'pm-risks', label: 'Risks', sublabel: 'Risk register', icon: <AlertTriangle size={16} />, action: () => go(`${base}/risks`), section: 'Current Project' });
      list.push({ id: 'pm-stakeholders', label: 'Stakeholders', sublabel: 'Stakeholder register', icon: <Users size={16} />, action: () => go(`${base}/stakeholders`), section: 'Current Project' });
      list.push({ id: 'pm-kpi', label: 'KPIs', sublabel: 'Key performance indicators', icon: <BarChart3 size={16} />, action: () => go(`${base}/kpi`), section: 'Current Project' });
      list.push({ id: 'pm-workflow', label: 'Workflows', sublabel: 'Visual workflow builder', icon: <Workflow size={16} />, action: () => go(`${base}/workflows`), section: 'Current Project' });
      list.push({ id: 'pm-chat', label: 'Open AI Chat', sublabel: 'AI co-pilot', icon: <MessageSquare size={16} />, action: () => { toggleChat(); setOpen(false); }, section: 'Current Project' });
    }

    // Actions
    list.push({ id: 'act-theme', label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, icon: theme === 'light' ? <Moon size={16} /> : <Sun size={16} />, action: () => { toggleTheme(); setOpen(false); }, section: 'Actions' });

    return list;
  }, [projects, isProjectPage, currentProjectId, theme, go, toggleTheme, toggleChat]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) =>
      i.label.toLowerCase().includes(q) ||
      i.sublabel?.toLowerCase().includes(q) ||
      i.section.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Keep selectedIdx in bounds
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      filtered[selectedIdx].action();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  // Group by section
  const sections: Record<string, CmdItem[]> = {};
  filtered.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} role="button" aria-label="Close command palette" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, pages, actions..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-400 text-center">No results found</p>
          ) : (
            Object.entries(sections).map(([section, sectionItems]) => (
              <div key={section}>
                <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {section}
                </div>
                {sectionItems.map((item) => {
                  const idx = globalIdx++;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === selectedIdx
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex-shrink-0 opacity-60">{item.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{item.sublabel}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
