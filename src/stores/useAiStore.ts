'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AiProvider = 'anthropic' | 'google' | 'openai';

export interface AiProviderConfig {
  provider: AiProvider;
  anthropicModel: string;
  googleModel: string;
  openaiModel: string;
}

interface AiStore extends AiProviderConfig {
  setProvider: (provider: AiProvider) => void;
  setModel: (provider: AiProvider, model: string) => void;
}

export const ANTHROPIC_MODELS = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Most capable)' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Balanced)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
];

export const GOOGLE_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fast)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Most capable)' },
  { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini Flash Thinking (Reasoning)' },
];

export const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Most capable)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
  { value: 'o4-mini', label: 'o4-mini (Reasoning)' },
];

export const useAiStore = create<AiStore>()(
  persist(
    (set) => ({
      provider: 'anthropic',
      anthropicModel: 'claude-opus-4-5',
      googleModel: 'gemini-2.0-flash',
      openaiModel: 'gpt-4o',

      setProvider: (provider) => set({ provider }),
      setModel: (provider, model) => {
        if (provider === 'anthropic') set({ anthropicModel: model });
        else if (provider === 'google') set({ googleModel: model });
        else set({ openaiModel: model });
      },
    }),
    {
      name: 'pm-app-ai-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
