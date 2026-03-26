'use client';

import { useState, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '@/stores/useChatStore';
import { useAiStore } from '@/stores/useAiStore';
import { useUiStore } from '@/stores/useUiStore';
import { useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import {
  MessageSquare,
  Send,
  Trash2,
  X,
  Loader2,
  Wrench,
  CheckCircle2,
  Bot,
  User,
} from 'lucide-react';

const TOOL_LABELS: Record<string, string> = {
  get_project_summary: 'Reading project summary',
  get_risks: 'Checking risks',
  get_issues: 'Checking issues',
  get_schedule_status: 'Checking schedule',
  get_stakeholders: 'Checking stakeholders',
  get_action_items: 'Checking action items',
  add_risk: 'Adding risk',
  add_issue: 'Adding issue',
  add_stakeholder: 'Adding stakeholder',
  add_action_item: 'Creating action item',
  add_decision: 'Logging decision',
};

export default function ChatPanel() {
  const projectId = useProjectId();
  const chatOpen = useUiStore((s) => s.chatOpen);
  const toggleChat = useUiStore((s) => s.toggleChat);
  const messages = useChatStore((s) => s.messages[projectId] ?? []);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearChat = useChatStore((s) => s.clearChat);
  const loadFromDb = useProjectStore((s) => s.loadFromDb);
  const model = useAiStore((s) => s.model);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(projectId, text, model);
    // Reload project data in case tools mutated it
    loadFromDb();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chatOpen || !projectId) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-indigo-500" />
          <span className="font-semibold text-sm text-slate-900 dark:text-white">AI Co-Pilot</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clearChat(projectId)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={toggleChat}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">AI Project Manager</p>
            <p className="text-xs mt-1">Ask me to add risks, check status, generate reports, or manage your project.</p>
            <div className="mt-4 space-y-1.5 text-xs text-left max-w-[260px] mx-auto">
              {[
                '"What\'s the project status?"',
                '"Add a risk about vendor delays"',
                '"Show me all blocked issues"',
                '"Create an action item for John"',
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint.replace(/"/g, '')); inputRef.current?.focus(); }}
                  className="block w-full text-left px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
              }`}
            >
              {/* Agent badge */}
              {msg.role === 'assistant' && msg.agent && (
                <div className="flex items-center gap-1 mb-1.5 text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                  <span>{msg.agent.icon}</span>
                  <span>{msg.agent.name}</span>
                </div>
              )}

              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400"
                    >
                      {tc.result ? (
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Loader2 size={12} className="animate-spin text-indigo-400 shrink-0" />
                      )}
                      <span>{TOOL_LABELS[tc.name] || tc.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              {msg.content ? (
                msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="chat-markdown prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: (props: ComponentPropsWithoutRef<'p'>) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />,
                        ul: (props: ComponentPropsWithoutRef<'ul'>) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5" {...props} />,
                        ol: (props: ComponentPropsWithoutRef<'ol'>) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5" {...props} />,
                        li: (props: ComponentPropsWithoutRef<'li'>) => <li className="leading-relaxed" {...props} />,
                        strong: (props: ComponentPropsWithoutRef<'strong'>) => <strong className="font-semibold" {...props} />,
                        code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'> & { className?: string }) => {
                          const isBlock = className?.includes('language-');
                          return isBlock ? (
                            <code className="block bg-slate-800 text-slate-200 rounded-md p-2 my-1.5 text-[11px] overflow-x-auto" {...props}>{children}</code>
                          ) : (
                            <code className="bg-slate-200 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 px-1 py-0.5 rounded text-[11px]" {...props}>{children}</code>
                          );
                        },
                        h1: (props: ComponentPropsWithoutRef<'h1'>) => <h1 className="text-sm font-bold mb-1" {...props} />,
                        h2: (props: ComponentPropsWithoutRef<'h2'>) => <h2 className="text-sm font-bold mb-1" {...props} />,
                        h3: (props: ComponentPropsWithoutRef<'h3'>) => <h3 className="text-xs font-bold mb-1" {...props} />,
                        blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => <blockquote className="border-l-2 border-indigo-400 pl-2 ml-1 italic text-slate-500 dark:text-slate-400" {...props} />,
                        table: (props: ComponentPropsWithoutRef<'table'>) => <div className="overflow-x-auto my-1.5"><table className="text-[11px] border-collapse w-full" {...props} /></div>,
                        th: (props: ComponentPropsWithoutRef<'th'>) => <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-left font-semibold" {...props} />,
                        td: (props: ComponentPropsWithoutRef<'td'>) => <td className="border border-slate-300 dark:border-slate-600 px-2 py-1" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )
              ) : msg.role === 'assistant' && isStreaming ? (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-3 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI co-pilot..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Ctrl+Enter to send</p>
      </div>
    </div>
  );
}
