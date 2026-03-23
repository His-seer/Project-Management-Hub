'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/safeStorage';
import type { ChatMessage, ChatStreamEvent } from '@/types/chat';
import { generateId } from '@/lib/ids';
import apiFetch from '@/lib/apiFetch';

const MAX_MESSAGES_PER_PROJECT = 50;

interface ChatStore {
  messages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  getMessages: (projectId: string) => ChatMessage[];
  sendMessage: (projectId: string, text: string, model: string) => Promise<void>;
  clearChat: (projectId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: {},
      isStreaming: false,

      getMessages: (projectId) => get().messages[projectId] ?? [],

      sendMessage: async (projectId, text, model) => {
        const userMsg: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        };

        // Add user message
        set((state) => {
          const existing = state.messages[projectId] ?? [];
          return {
            messages: {
              ...state.messages,
              [projectId]: [...existing, userMsg].slice(-MAX_MESSAGES_PER_PROJECT),
            },
            isStreaming: true,
          };
        });

        // Create placeholder assistant message
        const assistantId = generateId();
        set((state) => {
          const existing = state.messages[projectId] ?? [];
          return {
            messages: {
              ...state.messages,
              [projectId]: [
                ...existing,
                { id: assistantId, role: 'assistant' as const, content: '', toolCalls: [], timestamp: new Date().toISOString() },
              ],
            },
          };
        });

        try {
          const allMessages = get().messages[projectId] ?? [];
          const res = await apiFetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              messages: allMessages.filter((m) => m.role !== 'tool').slice(-20),
              model,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            throw new Error((err as { error?: string }).error ?? 'Request failed');
          }

          if (!res.body) throw new Error('No response body');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data) as ChatStreamEvent;

                if (event.type === 'text' && event.content) {
                  fullText += event.content;
                  // Update assistant message content
                  set((state) => {
                    const msgs = state.messages[projectId] ?? [];
                    return {
                      messages: {
                        ...state.messages,
                        [projectId]: msgs.map((m) =>
                          m.id === assistantId ? { ...m, content: fullText } : m
                        ),
                      },
                    };
                  });
                }

                if (event.type === 'tool_start' && event.name) {
                  set((state) => {
                    const msgs = state.messages[projectId] ?? [];
                    return {
                      messages: {
                        ...state.messages,
                        [projectId]: msgs.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                toolCalls: [
                                  ...(m.toolCalls ?? []),
                                  { name: event.name!, args: event.args ?? {} },
                                ],
                              }
                            : m
                        ),
                      },
                    };
                  });
                }

                if (event.type === 'tool_result' && event.name) {
                  set((state) => {
                    const msgs = state.messages[projectId] ?? [];
                    return {
                      messages: {
                        ...state.messages,
                        [projectId]: msgs.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                toolCalls: (m.toolCalls ?? []).map((tc) =>
                                  tc.name === event.name && !tc.result
                                    ? { ...tc, result: event.result }
                                    : tc
                                ),
                              }
                            : m
                        ),
                      },
                    };
                  });
                }

                if (event.type === 'agent_selected' && event.agent) {
                  set((state) => {
                    const msgs = state.messages[projectId] ?? [];
                    return {
                      messages: {
                        ...state.messages,
                        [projectId]: msgs.map((m) =>
                          m.id === assistantId
                            ? { ...m, agent: event.agent }
                            : m
                        ),
                      },
                    };
                  });
                }

                if (event.type === 'error' && event.error) {
                  fullText += `\n\n⚠️ ${event.error}`;
                  set((state) => {
                    const msgs = state.messages[projectId] ?? [];
                    return {
                      messages: {
                        ...state.messages,
                        [projectId]: msgs.map((m) =>
                          m.id === assistantId ? { ...m, content: fullText } : m
                        ),
                      },
                    };
                  });
                }
              } catch {
                // skip malformed SSE
              }
            }
          }
        } catch (err) {
          // Update assistant message with error
          const errorText = err instanceof Error ? err.message : 'Failed to get response';
          set((state) => {
            const msgs = state.messages[projectId] ?? [];
            return {
              messages: {
                ...state.messages,
                [projectId]: msgs.map((m) =>
                  m.id === assistantId ? { ...m, content: `⚠️ ${errorText}` } : m
                ),
              },
            };
          });
        } finally {
          set({ isStreaming: false });
        }
      },

      clearChat: (projectId) => {
        set((state) => {
          const { [projectId]: _, ...rest } = state.messages;
          return { messages: rest };
        });
      },
    }),
    {
      name: 'pm-app-chat',
      storage: safeStorage,
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
