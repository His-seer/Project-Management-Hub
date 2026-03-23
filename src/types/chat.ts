export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  agent?: { id: string; name: string; icon: string };
  timestamp: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ChatStreamEvent {
  type: 'text' | 'tool_start' | 'tool_result' | 'mutations' | 'error' | 'agent_selected';
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  modules?: string[];
  error?: string;
  agent?: { id: string; name: string; icon: string };
}
