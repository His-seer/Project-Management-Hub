'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';

interface AtlassianStore {
  baseUrl: string;
  email: string;
  apiToken: string;
  isConfigured: boolean;
  setCredentials: (baseUrl: string, email: string, apiToken: string) => void;
  clearCredentials: () => void;
}

export const useAtlassianStore = create<AtlassianStore>()(
  persist(
    (set) => ({
      baseUrl: '',
      email: '',
      apiToken: '',
      isConfigured: false,
      setCredentials: (baseUrl, email, apiToken) =>
        set({ baseUrl, email, apiToken, isConfigured: true }),
      clearCredentials: () =>
        set({ baseUrl: '', email: '', apiToken: '', isConfigured: false }),
    }),
    {
      name: 'pm-app-atlassian',
      storage: safeStorage,
    }
  )
);
