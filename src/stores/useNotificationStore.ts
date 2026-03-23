'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';
import { generateId } from '@/lib/ids';

export type NotificationType = 'warning' | 'suggestion' | 'info' | 'success';
export type NotificationSource = 'health-check' | 'risk-monitor' | 'deadline-watch' | 'ai-insight' | 'workflow';

export interface Notification {
  id: string;
  type: NotificationType;
  source: NotificationSource;
  title: string;
  message: string;
  module?: string;
  projectId: string;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: (projectId: string) => void;
  dismiss: (id: string) => void;
  dismissAll: (projectId: string) => void;
  getUnreadCount: (projectId: string) => number;
  getProjectNotifications: (projectId: string) => Notification[];
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (n) => {
        const notification: Notification = {
          ...n,
          id: generateId(),
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          notifications: [notification, ...s.notifications].slice(0, 100), // cap at 100
        }));
      },

      markRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllRead: (projectId) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.projectId === projectId ? { ...n, read: true } : n
          ),
        }));
      },

      dismiss: (id) => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
      },

      dismissAll: (projectId) => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.projectId !== projectId),
        }));
      },

      getUnreadCount: (projectId) => {
        return get().notifications.filter((n) => n.projectId === projectId && !n.read).length;
      },

      getProjectNotifications: (projectId) => {
        return get().notifications.filter((n) => n.projectId === projectId);
      },
    }),
    {
      name: 'pm-app-notifications',
      storage: safeStorage,
    }
  )
);
