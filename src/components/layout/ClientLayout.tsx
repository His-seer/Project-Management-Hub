'use client';
import { useUiStore } from '@/stores/useUiStore';
import { BarChart3, Menu } from 'lucide-react';
import Link from 'next/link';
import { ToastProvider } from '@/components/shared/Toast';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, openMobileSidebar } = useUiStore();

  return (
    <ToastProvider>
      {/* Mobile top bar — hidden on md+ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 flex items-center px-4 gap-3 z-30 border-b border-slate-700/50">
        <button
          onClick={openMobileSidebar}
          className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <BarChart3 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">PM Hub</span>
        </Link>
      </header>

      {/* Main content — margin shifts with sidebar on desktop */}
      <main
        className={[
          'pt-14 md:pt-0 min-h-screen transition-all duration-200 bg-slate-50 dark:bg-slate-950',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
        ].join(' ')}
      >
        {children}
      </main>
    </ToastProvider>
  );
}
