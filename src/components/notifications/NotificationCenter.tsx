'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectId, useCurrentProject } from '@/hooks/useCurrentProject';
import { useNotificationStore, type Notification } from '@/stores/useNotificationStore';
import { runHealthCheck } from '@/lib/healthCheck';
import Link from 'next/link';
import {
  Bell,
  X,
  AlertTriangle,
  Lightbulb,
  Info,
  CheckCircle2,
  Trash2,
  CheckCheck,
} from 'lucide-react';

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  warning: AlertTriangle,
  suggestion: Lightbulb,
  info: Info,
  success: CheckCircle2,
};

const COLOR_MAP: Record<string, string> = {
  warning: 'text-amber-500',
  suggestion: 'text-indigo-500',
  info: 'text-blue-500',
  success: 'text-emerald-500',
};

export default function NotificationCenter() {
  const projectId = useProjectId();
  const project = useCurrentProject();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const allNotifications = useNotificationStore((s) => s.notifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const dismissAll = useNotificationStore((s) => s.dismissAll);

  const notifications = projectId ? allNotifications.filter((n) => n.projectId === projectId) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Run health check when project loads — use ref to avoid infinite loops
  const lastCheckedRef = useRef<string>('');
  useEffect(() => {
    if (!project || !projectId) return;
    const checkKey = `${projectId}:${project.meta.updatedAt}`;
    if (lastCheckedRef.current === checkKey) return;
    lastCheckedRef.current = checkKey;

    const alerts = runHealthCheck(project, projectId);
    const existingTitles = new Set(
      useNotificationStore.getState().getProjectNotifications(projectId).map((n) => n.title)
    );
    alerts.forEach((alert) => {
      if (!existingTitles.has(alert.title)) {
        addNotification({ ...alert, projectId });
      }
    });
  }, [project?.meta.updatedAt, projectId, addNotification]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!projectId) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(projectId); }}
        data-tour="notification-btn"
        className="fixed bottom-6 right-20 z-40 p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-16 z-50 w-[380px] max-h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dismissAll(projectId)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                title="Clear all"
                aria-label="Clear all notifications"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                aria-label="Close notifications"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <CheckCheck size={24} className="mx-auto mb-2 opacity-50" />
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onDismiss={dismiss} onClose={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification: n, onDismiss, onClose }: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = ICON_MAP[n.type] || Info;
  const color = COLOR_MAP[n.type] || 'text-slate-500';

  return (
    <div className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
      <div className="flex gap-3">
        <Icon size={16} className={`${color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-900 dark:text-white truncate">{n.title}</span>
            <button onClick={() => onDismiss(n.id)} className="text-slate-300 hover:text-slate-500 shrink-0" aria-label="Dismiss notification">
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-slate-400">{n.source}</span>
            {n.actionLabel && n.actionHref && (
              <Link
                href={n.actionHref}
                onClick={onClose}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
              >
                {n.actionLabel} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
