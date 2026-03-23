'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';

interface UiStore {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  chatOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleChat: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      chatOpen: false,
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
      toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
    }),
    {
      name: 'pm-app-ui',
      storage: safeStorage,
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
