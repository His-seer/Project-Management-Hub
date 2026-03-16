'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/stores/useUiStore';
import { useProjectStore } from '@/stores/useProjectStore';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  GanttChart,
  Network,
  Grid3X3,
  AlertTriangle,
  AlertCircle,
  GitBranch,
  Users,
  DollarSign,
  BarChart3,
  Map,
  Shield,
  Wallet,
  UserCheck,
  MessageSquare,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  CheckSquare,
  History,
  Bookmark,
  Settings,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ClipboardList,
  FlaskConical,
  FileBarChart,
  X,
} from 'lucide-react';

const moduleGroups = [
  {
    label: 'PLANNING',
    items: [
      { href: 'charter', label: 'Charter', icon: FileText },
      { href: 'plan', label: 'Project Plan', icon: FolderKanban },
      { href: 'gantt', label: 'Gantt Chart', icon: GanttChart },
      { href: 'wbs', label: 'WBS', icon: Network },
      { href: 'estimates', label: 'Estimates', icon: DollarSign },
      { href: 'roadmap', label: 'Roadmap', icon: Map },
      { href: 'assumptions', label: 'Assumptions', icon: FlaskConical },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { href: 'raci', label: 'RACI Matrix', icon: Grid3X3 },
      { href: 'stakeholders', label: 'Stakeholders', icon: UserCheck },
      { href: 'resources', label: 'Resources', icon: Users },
      { href: 'communications', label: 'Comms Plan', icon: MessageSquare },
    ],
  },
  {
    label: 'EXECUTION',
    items: [
      { href: 'jira', label: 'Jira Hub', icon: FolderKanban },
      { href: 'issues', label: 'Issue Tracker', icon: AlertCircle },
      { href: 'actions', label: 'Action Items', icon: CheckSquare },
      { href: 'meetings', label: 'Meetings', icon: BookOpen },
      { href: 'decisions', label: 'Decision Log', icon: ClipboardList },
    ],
  },
  {
    label: 'MONITORING',
    items: [
      { href: '', label: 'Dashboard', icon: LayoutDashboard },
      { href: 'kpi', label: 'KPI Dashboard', icon: BarChart3 },
      { href: 'risks', label: 'Risk Register', icon: AlertTriangle },
      { href: 'changes', label: 'Changes', icon: GitBranch },
      { href: 'status-report', label: 'Status Report', icon: FileBarChart },
      { href: 'baselines', label: 'Baselines', icon: Bookmark },
    ],
  },
  {
    label: 'GOVERNANCE',
    items: [
      { href: 'governance', label: 'Governance', icon: Shield },
      { href: 'funding', label: 'Funding', icon: Wallet },
      { href: 'lessons', label: 'Lessons Learned', icon: Lightbulb },
    ],
  },
  {
    label: 'DOCS',
    items: [
      { href: 'confluence', label: 'Confluence Hub', icon: BookOpen },
      { href: 'history', label: 'Change History', icon: History },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUiStore();
  const projects = useProjectStore((s) => s.projects);
  const projectList = Object.values(projects);

  const pathParts = pathname.split('/');
  const projectIdx = pathParts.indexOf('projects');
  const currentProjectId = projectIdx >= 0 ? pathParts[projectIdx + 1] : null;
  const isProjectPage = currentProjectId && currentProjectId !== 'new';

  const handleNavClick = () => {
    closeMobileSidebar();
  };

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700/50 flex-shrink-0">
        {!collapsed && (
          <Link href="/" onClick={handleNavClick} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">PM Hub</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center mx-auto">
            <BarChart3 size={14} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={mobileSidebarOpen ? closeMobileSidebar : toggleSidebar}
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {mobileSidebarOpen ? <X size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Portfolio + New Project */}
      <div className="px-2 pt-3 pb-2 border-b border-slate-700/50 flex-shrink-0">
        <Link
          href="/"
          onClick={handleNavClick}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title={collapsed ? 'Portfolio' : undefined}
        >
          <LayoutDashboard size={16} />
          {!collapsed && 'Portfolio'}
        </Link>
        <Link
          href="/projects/new"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title={collapsed ? 'New Project' : undefined}
        >
          <Plus size={16} />
          {!collapsed && 'New Project'}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {isProjectPage ? (
          <>
            {!collapsed && (
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest truncate">
                {projects[currentProjectId]?.meta.name || 'Project'}
              </div>
            )}

            {moduleGroups.map((group) => (
              <div key={group.label} className="mb-3">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const fullHref = item.href
                    ? `/projects/${currentProjectId}/${item.href}`
                    : `/projects/${currentProjectId}`;
                  const isActive = pathname === fullHref;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={fullHref}
                      onClick={handleNavClick}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={15} />
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="border-t border-slate-700/50 pt-2 mt-1">
              <Link
                href={`/projects/${currentProjectId}/completeness`}
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname.endsWith('/completeness')
                    ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={collapsed ? 'Completeness' : undefined}
              >
                <CheckCircle2 size={15} />
                {!collapsed && 'Completeness'}
              </Link>
            </div>
          </>
        ) : (
          !collapsed && (
            <div>
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                Projects ({projectList.length})
              </div>
              {projectList.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">No projects yet</p>
              ) : (
                projectList.map((p) => (
                  <Link
                    key={p.meta.id}
                    href={`/projects/${p.meta.id}`}
                    onClick={handleNavClick}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        p.meta.health === 'green'
                          ? 'bg-emerald-400'
                          : p.meta.health === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="truncate">{p.meta.name}</span>
                  </Link>
                ))
              )}
            </div>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-slate-700/50 flex items-center gap-1 flex-shrink-0">
        {collapsed && !mobileSidebarOpen ? (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors mx-auto"
          >
            <PanelLeftOpen size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <Link
              href="/settings"
              onClick={handleNavClick}
              className={`p-2 rounded-md hover:bg-slate-800 transition-colors ${pathname === '/settings' ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings size={16} />
            </Link>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-full bg-slate-900 flex-col transition-all duration-200 z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-slate-900 flex flex-col z-50 md:hidden transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent collapsed={false} />
      </aside>
    </>
  );
}
