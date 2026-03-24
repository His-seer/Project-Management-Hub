'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';

export const GOOGLE_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Most capable)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast + Thinking)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Efficient)' },
];

interface AiStore {
  model: string;
  setModel: (model: string) => void;
}

export const useAiStore = create<AiStore>()(
  persist(
    (set) => ({
      model: 'gemini-2.5-flash',
      setModel: (model) => set({ model }),
    }),
    {
      name: 'pm-app-ai-config',
      storage: safeStorage,
    }
  )
);
