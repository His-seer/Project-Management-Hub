'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';

export const GOOGLE_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Most capable)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast + Thinking)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Efficient)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Stable)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Fastest)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Experimental)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Experimental)' },
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
